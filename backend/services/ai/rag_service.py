import logging
from typing import List, Dict, Any, Optional
import os
from datetime import datetime

try:
    import chromadb
except ImportError:
    chromadb = None

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self):
        self.client = None
        self.collections = {}
        self._init_db()

    def _init_db(self):
        if not chromadb:
            logger.warning("ChromaDB not installed. RAG features will be disabled.")
            return

        try:
            db_path = "backend/data/chroma_db"
            self.client = chromadb.PersistentClient(path=db_path)
            self.collections['travel_knowledge'] = self.client.get_or_create_collection("travel_knowledge")
            logger.info("RAG Service initialized with ChromaDB")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")

    async def search(self, query: str, collection: str = 'travel_knowledge', n_results: int = 3) -> List[Dict]:
        if not self.client or collection not in self.collections:
            return []
        
        try:
            # Note: For real embeddings we'd need a model, using chromadb's default for now
            results = self.collections[collection].query(
                query_texts=[query],
                n_results=n_results
            )
            
            formatted = []
            for i in range(len(results['documents'][0])):
                formatted.append({
                    'content': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                    'id': results['ids'][0][i]
                })
            return formatted
        except Exception as e:
            logger.error(f"RAG Search error: {e}")
            return []

rag_service = RAGService()
