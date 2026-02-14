
import aiohttp
try:
    print(f"aiohttp version: {aiohttp.__version__}")
    print(f"Has ClientConnectorDNSError: {hasattr(aiohttp, 'ClientConnectorDNSError')}")
    if not hasattr(aiohttp, 'ClientConnectorDNSError'):
        from aiohttp import client_exceptions
        print(f"Found in client_exceptions: {hasattr(client_exceptions, 'ClientConnectorDNSError')}")
except Exception as e:
    print(f"Error: {e}")
