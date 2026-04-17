try:
    with open('server.log', 'rb') as f:
        content = f.read()
    try:
        text = content.decode('utf-16-le')
    except:
        text = content.decode('utf-8', errors='ignore')
    
    print("--- SERVER LOG START ---")
    print(text)
    print("--- SERVER LOG END ---")
except Exception as e:
    print(f"Error: {e}")
