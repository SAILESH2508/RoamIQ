"""
Database migration management system
"""
import os
import sqlite3
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class MigrationManager:
    def __init__(self, db_path='instance/roamiq.db'):
        self.db_path = db_path
        self.migrations_dir = 'backend/migrations/versions'
        os.makedirs(self.migrations_dir, exist_ok=True)
        self.init_migrations_table()
    
    def init_migrations_table(self):
        """Initialize migrations tracking table"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version VARCHAR(50) UNIQUE NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()
    
    def create_migration(self, name: str) -> str:
        """Create a new migration file"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        version = f"{timestamp}_{name}"
        filename = f"{version}.py"
        filepath = os.path.join(self.migrations_dir, filename)
        
        template = f'''"""
Migration: {name}
Created: {datetime.now().isoformat()}
"""

def upgrade(conn):
    """Apply migration"""
    # Add your upgrade SQL here
    # Example:
    # conn.execute("ALTER TABLE users ADD COLUMN new_field TEXT")
    pass

def downgrade(conn):
    """Rollback migration"""
    # Add your downgrade SQL here
    # Example:
    # conn.execute("ALTER TABLE users DROP COLUMN new_field")
    pass
'''
        
        with open(filepath, 'w') as f:
            f.write(template)
        
        logger.info(f"Created migration: {filename}")
        return version
    
    def get_pending_migrations(self):
        """Get list of pending migrations"""
        with sqlite3.connect(self.db_path) as conn:
            applied = {row[0] for row in conn.execute("SELECT version FROM migrations")}
        
        all_migrations = []
        if os.path.exists(self.migrations_dir):
            for filename in sorted(os.listdir(self.migrations_dir)):
                if filename.endswith('.py') and not filename.startswith('__'):
                    version = filename[:-3]  # Remove .py extension
                    if version not in applied:
                        all_migrations.append(version)
        
        return all_migrations
    
    def apply_migration(self, version: str):
        """Apply a single migration"""
        migration_file = os.path.join(self.migrations_dir, f"{version}.py")
        
        if not os.path.exists(migration_file):
            raise FileNotFoundError(f"Migration file not found: {migration_file}")
        
        # Import and execute migration
        import importlib.util
        spec = importlib.util.spec_from_file_location(version, migration_file)
        migration_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration_module)
        
        with sqlite3.connect(self.db_path) as conn:
            try:
                migration_module.upgrade(conn)
                conn.execute("INSERT INTO migrations (version) VALUES (?)", (version,))
                conn.commit()
                logger.info(f"Applied migration: {version}")
            except Exception as e:
                conn.rollback()
                logger.error(f"Failed to apply migration {version}: {e}")
                raise
    
    def rollback_migration(self, version: str):
        """Rollback a single migration"""
        migration_file = os.path.join(self.migrations_dir, f"{version}.py")
        
        if not os.path.exists(migration_file):
            raise FileNotFoundError(f"Migration file not found: {migration_file}")
        
        # Import and execute rollback
        import importlib.util
        spec = importlib.util.spec_from_file_location(version, migration_file)
        migration_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration_module)
        
        with sqlite3.connect(self.db_path) as conn:
            try:
                migration_module.downgrade(conn)
                conn.execute("DELETE FROM migrations WHERE version = ?", (version,))
                conn.commit()
                logger.info(f"Rolled back migration: {version}")
            except Exception as e:
                conn.rollback()
                logger.error(f"Failed to rollback migration {version}: {e}")
                raise
    
    def migrate(self):
        """Apply all pending migrations"""
        pending = self.get_pending_migrations()
        
        if not pending:
            logger.info("No pending migrations")
            return
        
        logger.info(f"Applying {len(pending)} migrations...")
        
        for version in pending:
            self.apply_migration(version)
        
        logger.info("All migrations applied successfully")
    
    def status(self):
        """Show migration status"""
        with sqlite3.connect(self.db_path) as conn:
            applied = {row[0]: row[1] for row in conn.execute("SELECT version, applied_at FROM migrations")}
        
        pending = self.get_pending_migrations()
        
        print("Migration Status:")
        print("================")
        
        if applied:
            print("\nApplied migrations:")
            for version, applied_at in sorted(applied.items()):
                print(f"  ✓ {version} (applied: {applied_at})")
        
        if pending:
            print("\nPending migrations:")
            for version in pending:
                print(f"  ○ {version}")
        
        if not applied and not pending:
            print("No migrations found")

# CLI interface
if __name__ == "__main__":
    import sys
    
    manager = MigrationManager()
    
    if len(sys.argv) < 2:
        print("Usage: python migration_manager.py <command> [args]")
        print("Commands: create <name>, migrate, status, rollback <version>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "create" and len(sys.argv) > 2:
        name = "_".join(sys.argv[2:])
        version = manager.create_migration(name)
        print(f"Created migration: {version}")
    
    elif command == "migrate":
        manager.migrate()
    
    elif command == "status":
        manager.status()
    
    elif command == "rollback" and len(sys.argv) > 2:
        version = sys.argv[2]
        manager.rollback_migration(version)
    
    else:
        print("Invalid command or missing arguments")