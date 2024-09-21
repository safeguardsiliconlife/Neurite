from typing import List, Dict, Any
import os
import spacy
from flask import Flask, request, jsonify

from transformers import pipeline
import torch 
import json
import requests
import numpy as np
from flask_cors import CORS

PORT = 3016



# TODO: abstract out on different process


device = torch.device(0)
# device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Set the CUDA_VISIBLE_DEVICES environment variable if not already set
# This allows you to specify which GPUs to use, e.g., "0,1" for GPU 0 and 1
# if device.type == "cuda":
#     if not os.environ.get("CUDA_VISIBLE_DEVICES"):
#         os.environ["CUDA_VISIBLE_DEVICES"] = "0"  # Default to GPU 0 if not set

#     # Get the list of visible devices and their count
#     cuda_devices = os.environ["CUDA_VISIBLE_DEVICES"].split(",")
#     num_gpus = len(cuda_devices)
    
#     print(f"Using {num_gpus} GPU(s): {cuda_devices}")
# else:
#     print("GPU not available. Using CPU.")

# http server 
app = Flask(__name__)
origins = ['http://localhost:8080']
CORS(app, origins=origins)






# Load spaCy model
nlp = spacy.load("en_core_web_trf")


class SpacyEntityExtractor():
    def __init__(self):
        self.nlp = spacy.load("en_core_web_trf")
        spacy.prefer_gpu()

    async def extract(self, text):
        doc = self.nlp(text)
    
        # Extract entities (nodes)
        entities = [
            {
                "text": ent.text,
                "label": ent.label_,
                "start": ent.start_char,
                "end": ent.end_char
            }
            for ent in doc.ents
        ]
        
        # Extract noun chunks (potential nodes)
        noun_chunks = [
            {
                "text": chunk.text,
                "root": chunk.root.text,
                "start": chunk.start_char,
                "end": chunk.end_char
            }
            for chunk in doc.noun_chunks
        ]
        
        # Extract dependencies (edges)
        dependencies = [
            {
                "source": token.head.text,
                "target": token.text,
                "relation": token.dep_
            }
            for token in doc if token.dep_ != "ROOT"
        ]
        
        return {
            "entities": entities,
            "noun_chunks": noun_chunks,
            "dependencies": dependencies
        }


class HuggingFaceEntityExtractor():
    def __init__(self):
        self.ner_pipeline = pipeline("ner", device=device, model='FacebookAI/xlm-roberta-large-finetuned-conll03-english')

    async def extract(self, text):
        hf_entities = self.ner_pipeline(text)
        # Convert np.float32 to float
        for entity in hf_entities:
            for key, value in entity.items():
                if isinstance(value, np.float32):
                    entity[key] = float(value)
        return {
            "hf_entities": hf_entities
        }
        # return [{"text": ent["word"], "label": ent["entity"]} for ent in hf_entities]


class HuggingFaceSentimentExtractor():
    def __init__(self):
        self.sentiment_pipeline = pipeline("sentiment-analysis", device=device)
        self.tokenizer = self.sentiment_pipeline.tokenizer
        self.max_length = self.tokenizer.model_max_length

    async def extract(self, text):
        print("HuggingFaceSentimentExtractor len(text):", len(text))
        # Split the text into smaller chunks
        sentences = text.split('. ')
        chunks = []
        current_chunk = ''
        for sentence in sentences:
            if len(self.tokenizer.tokenize(current_chunk + sentence)) < self.max_length:
                current_chunk += sentence + '. '
            else:
                chunks.append(current_chunk.strip())
                current_chunk = sentence + '. '
        if current_chunk:
            chunks.append(current_chunk.strip())

        print(f'processing {len(chunks)} chunks because max tokenizer length is {self.max_length}')

        sentiments = []
        for chunk in chunks:
            sentiment = self.sentiment_pipeline(chunk)
            sentiments.extend(sentiment)

        # Convert np.float32 to float
        for result in sentiments:
            for key, value in result.items():
                if isinstance(value, np.float32):
                    result[key] = float(value)

        return {
            "sentiment": sentiments
        }

        # return {
        #     "label": sentiment["label"],
        #     "score": sentiment["score"]
        # }


# Initialize extractors
spacy_extractor = SpacyEntityExtractor()
hf_entity_extractor = HuggingFaceEntityExtractor()
hf_sentiment_extractor = HuggingFaceSentimentExtractor()


async def extract_metadata(text: str) -> Dict[str, Any]:
    spacy_result = await spacy_extractor.extract(text)
    hf_entity_result = await hf_entity_extractor.extract(text)
    hf_sentiment_result = await hf_sentiment_extractor.extract(text)
    
    return {
        **spacy_result,
        **hf_entity_result,
        **hf_sentiment_result
    }

@app.route('/breakup', methods=['POST'])
async def breakup():
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    # Await the async function to get the result instead of a coroutine
    metadata = await extract_metadata(text)
    
    # Add placeholder for human tagging
    metadata["human_tags"] = []
    
    # print('\n\n\n')
    # print("metadata", type(metadata), metadata)
    # print('\n\n\n')

    return jsonify(metadata)


@app.route('/rettam/nodes', methods=['POST'])
async def rettam_nodes():
    data = request.json
    origin_node = data.get('originNode', {})
    context_nodes = data.get('contextNodes', [])
    
    # Prepare the text for metadata extraction
    text = ""
    for node in context_nodes:
        if 'content' in node:
            text += node['content'] + " "
    text += origin_node.get('content', '')
    
    # Strip and check if text is empty
    text = text.strip()
    if not text:
        return jsonify({"error": "Empty string input"}), 400
    
    # Extract metadata
    metadata = await extract_metadata(text)
    def print_metadata(metadata, parent_key=''):
        if isinstance(metadata, dict):
            for key, value in metadata.items():
                full_key = f"{parent_key}.{key}" if parent_key else key
                print_metadata(value, full_key)
        elif isinstance(metadata, list):
            for index, item in enumerate(metadata):
                full_key = f"{parent_key}[{index}]"
                print_metadata(item, full_key)
        else:
            print(f"{parent_key}: {metadata} (type: {type(metadata)})")

    print_metadata(metadata)
      

    # You might want to process the metadata or create new nodes here
    # For now, we'll just return the metadata
    return jsonify(metadata)

# @app.route('/tag', methods=['POST'])
# def add_human_tag():
#     data = request.json
#     text = data.get('text', '')
#     tag = data.get('tag', '')
#     start = data.get('start', 0)
#     end = data.get('end', len(text))
    
#     if not text or not tag:
#         return jsonify({"error": "Text and tag are required"}), 400
    
#     # In a real application, you'd store this tag in a database
#     # Here, we'll just return it as if it was stored
#     human_tag = {
#         "text": text[start:end],
#         "tag": tag,
#         "start": start,
#         "end": end
#     }
    
#     return jsonify({"message": "Tag added successfully", "tag": human_tag})

if __name__ == '__main__':
    app.run(port=PORT, debug=True)

