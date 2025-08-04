from config import get_mongo_client  
# Get MongoDB client and database
client = get_mongo_client()
db = client["edr_logs"]

def insert_log(module_name, log_data):
    try:
        collection = db[f"{module_name}_logs"]
        result = collection.insert_one(log_data)
        return {"status": "success", "id": str(result.inserted_id)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_download_logs():
    try:
        collection = db["download_logs"]
        logs = list(collection.find({}, {"_id": 0}))  # Exclude MongoDB's _id field
        return logs
    except Exception as e:
        return []
