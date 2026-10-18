import mysql.connector
from mysql.connector import Error

def connect():
    pwd = 'sajnilol'
    print(f"Testing connection to MySQL with password '{pwd}'...")
    
    try:
        # Try connecting to server first (no DB)
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password=pwd
        )
        if conn.is_connected():
            print("✅ Connected to MySQL Server!")
            
            cursor = conn.cursor()
            cursor.execute("SHOW DATABASES LIKE 'college_hub'")
            result = cursor.fetchone()
            if result:
                print("✅ Database 'college_hub' exists!")
            else:
                print("❌ Database 'college_hub' does NOT exist.")
                print("   Attempts to create it...")
                try:
                    cursor.execute("CREATE DATABASE college_hub")
                    print("   ✅ Created 'college_hub' database.")
                except Error as e:
                    print(f"   ❌ Failed to create database: {e}")
            
            cursor.close()
            conn.close()
            return True
            
    except Error as e:
        print(f"❌ Connection Failed: {e}")
        return False

if __name__ == '__main__':
    connect()
