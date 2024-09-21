import streamlit as st
import requests
import networkx as nx
import json
from pyvis.network import Network
from streamlit.components.v1 import components
import os

# Set page configuration
st.set_page_config(layout="wide")

# Function to load explorations from local storage
def load_explorations():
    if os.path.exists('explorations.json'):
        with open('explorations.json', 'r') as f:
            return json.load(f)
    return {}

# Function to save explorations to local storage
def save_explorations(explorations):
    with open('explorations.json', 'w') as f:
        json.dump(explorations, f)

# Initialize session state
if 'explorations' not in st.session_state:
    st.session_state['explorations'] = load_explorations()
if 'current_exploration' not in st.session_state:
    st.session_state['current_exploration'] = None
if 'show_entities' not in st.session_state:
    st.session_state['show_entities'] = True
if 'show_dependencies' not in st.session_state:
    st.session_state['show_dependencies'] = True

with st.sidebar:
    st.title("Text Exploration")

    # Create new exploration
    if st.button("Create New Exploration"):
        new_exploration_name = f"Exploration {len(st.session_state['explorations'])+1}"
        st.session_state['explorations'][new_exploration_name] = {"text": "", "metadata": None}
        st.session_state['current_exploration'] = new_exploration_name
        save_explorations(st.session_state['explorations'])
        st.rerun()

    explorations = st.session_state['explorations']
    exploration_names = list(explorations.keys())

    # Select existing exploration
    if exploration_names:
        selected_exploration = st.selectbox(
            "Select Exploration",
            options=exploration_names,
            index=exploration_names.index(st.session_state['current_exploration']) if st.session_state['current_exploration'] in exploration_names else 0
        )
        st.session_state['current_exploration'] = selected_exploration

        # Delete button for selected exploration
        if st.button(f"Delete {selected_exploration}"):
            del st.session_state['explorations'][selected_exploration]
            save_explorations(st.session_state['explorations'])
            st.session_state['current_exploration'] = None
            st.rerun()
    else:
        st.write("No explorations available. Create a new one.")

    # Clear all button
    if st.button("Clear All Explorations"):
        st.session_state['explorations'] = {}
        save_explorations(st.session_state['explorations'])
        st.session_state['current_exploration'] = None
        st.rerun()

    if st.session_state['current_exploration']:
        current_exploration = st.session_state['current_exploration']
        text = explorations[current_exploration]['text']
        text_input = st.text_area("Input Text", value=text)
        if st.button("Process Text"):
            # Send text to backend and get metadata
            url = "http://localhost:3016/breakup"
            payload = {"text": text_input}
            response = requests.post(url, json=payload)
            if response.status_code == 200:
                metadata = response.json()
                st.session_state['explorations'][current_exploration]['text'] = text_input
                st.session_state['explorations'][current_exploration]['metadata'] = metadata
                save_explorations(st.session_state['explorations'])
                st.rerun()
            else:
                st.error("Error processing text.")

# Main area
if st.session_state['current_exploration']:
    current_exploration = st.session_state['current_exploration']
    exploration = st.session_state['explorations'][current_exploration]
    metadata = exploration.get('metadata', None)
    print("metadata", metadata)
    if metadata:
        st.header(f"Graph for {current_exploration}")

        # Add toggles for showing/hiding entities and dependencies
        col1, col2 = st.columns(2)
        with col1:
            st.session_state['show_entities'] = st.checkbox("Show Entities", value=st.session_state['show_entities'])
        with col2:
            st.session_state['show_dependencies'] = st.checkbox("Show Dependencies", value=st.session_state['show_dependencies'])

        # Build graph from metadata
        G = nx.DiGraph()
        entities = metadata.get('entities', [])
        dependencies = metadata.get('dependencies', [])
        noun_chunks = metadata.get('noun_chunks', [])

        BASE_INPUT = 'USERINPUT'

        G.add_node(BASE_INPUT, label=BASE_INPUT, title=BASE_INPUT, color='green')
        # Add entities as nodes
        if st.session_state['show_entities']:
            for entity in entities:
                G.add_node(entity['text'], label=entity['text'], title=entity['label'], color='lightblue')
                G.add_edge(BASE_INPUT, entity['text'], label=entity['label'], title=entity['label'])

        # Add noun_chunks as nodes (optional)
        # for chunk in noun_chunks:
        #     G.add_node(chunk['text'], label='Noun Chunk', title=chunk['text'], color='purple')

        # Add dependencies as edges
        if st.session_state['show_dependencies']:
            for dep in dependencies:
                source = dep['source']
                target = dep['target']
                relation = dep['relation']
                G.add_node(source, color='orange')
                G.add_node(target, color='orange')
                G.add_edge(source, target, label=relation, title=relation)

        # Render the graph using Pyvis
        net = Network(height="750px", width="100%", directed=True)
        net.from_nx(G)

        for edge in net.edges:
            edge['title'] = edge.get('label', '')

        # Generate the graph HTML file
        html_string = net.generate_html(notebook=False)
        st.components.v1.html(html_string, height=750, width=1000, scrolling=True)

        # Display metadata
        st.subheader("Extracted Metadata")
        st.write("**Entities:**")
        st.json(entities)
        st.write("**Dependencies:**")
        st.json(dependencies)
        st.write("**Noun Chunks:**")
        st.json(noun_chunks)
    else:
        st.write("No metadata available. Please process the text.")
