from pymongo import MongoClient

def get_mongo_client():
    # Local MongoDB
    uri = "mongodb://localhost:27017"
    client = MongoClient(uri)
    return client
