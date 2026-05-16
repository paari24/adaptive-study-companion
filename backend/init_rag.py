"""One-time script to set up pgvector tables and embed all topic sections."""
from services import rag_service

print("Initializing RAG...")
rag_service.initialize()
print("Done. Topics embedded into section_embeddings table.")
