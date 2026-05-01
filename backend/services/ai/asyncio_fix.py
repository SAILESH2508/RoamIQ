
"""
AsyncIO Shutdown Fix
Add this to your LLMProvider to prevent shutdown issues
"""

import asyncio
import threading
from functools import wraps

def async_fix(func):
    """Decorator to handle asyncio event loop issues"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            # Try to get current loop
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                # Create new loop if current is closed
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            # Check if we're in the main thread
            if threading.current_thread() == threading.main_thread():
                # Use asyncio.run in main thread
                return asyncio.run(func(*args, **kwargs))
            else:
                # Use create_task in other threads
                task = loop.create_task(func(*args, **kwargs))
                return loop.run_until_complete(task)
                
        except RuntimeError as e:
            if "no running event loop" in str(e).lower():
                # No loop running, create one
                return asyncio.run(func(*args, **kwargs))
            else:
                raise e
    
    return wrapper

# Usage example:
# @async_fix
# async def your_async_function():
#     # Your async code here
#     pass
