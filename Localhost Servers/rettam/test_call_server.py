import requests





def test_breakup_endpoint():
    url = 'http://localhost:3016/breakup'
    test_paragraph = '''
        The quick brown fox jumps over the lazy dog. This is a test paragraph for our NLP processing endpoint.
    '''
    
    response = requests.post(url, json={'text': test_paragraph})
    
    if response.status_code == 200:
        print("Breakup test successful. Response:")
        print(response.json())
    else:
        print(f"Breakup test failed. Status code: {response.status_code}")
        print(f"Response: {response.text}")

def test_rettam_nodes_endpoint():
    url = 'http://localhost:3016/rettam/nodes'
    test_data = {
        'originNode': {
            'content': 'This is the main content of the origin node.'
        },
        'contextNodes': [
            {'content': 'This is context node 1.'},
            {'content': 'This is context node 2.'}
        ]
    }
    
    response = requests.post(url, json=test_data)
    
    if response.status_code == 200:
        print("Rettam nodes test successful. Response:")
        print(response.json())
    else:
        print(f"Rettam nodes test failed. Status code: {response.status_code}")
        print(f"Response: {response.text}")











# Choose which endpoint to test
TEST_ENDPOINT = 'rettam_nodes'  # Change to 'breakup' to test the breakup endpoint






if TEST_ENDPOINT == 'breakup':
    test_breakup_endpoint()
elif TEST_ENDPOINT == 'rettam_nodes':
    test_rettam_nodes_endpoint()
else:
    print(f"Unknown endpoint: {TEST_ENDPOINT}")