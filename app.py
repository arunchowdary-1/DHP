from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Base path where your CSV files are stored
base_path = os.path.join(os.getcwd(), 'data')

# Function to safely read a CSV file
def safe_read_csv(file_path):
    try:
        return pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"Warning: File not found: {file_path}")
        return pd.DataFrame()

# Load CSV data for supported cities
data_files = {
    'GURGAON': safe_read_csv(os.path.join(base_path, 'GURGAON.csv')),
    'HYDERABAD': safe_read_csv(os.path.join(base_path, 'HYDERABAD.csv')),
    'KOLKATA': safe_read_csv(os.path.join(base_path, 'KOLKATA.csv')),
    'PUNE': safe_read_csv(os.path.join(base_path, 'PUNE.csv')),
    'NEWDELHI': safe_read_csv(os.path.join(base_path, 'NewDelhi.csv')),
    'CHENNAI': safe_read_csv(os.path.join(base_path, 'chennai.csv')),
    'BANGLORE': safe_read_csv(os.path.join(base_path, 'BANGLORE.csv')),
}

@app.route('/')
def home():
    return jsonify({'message': 'Welcome to the UrbanNest City Data API!'})

@app.route('/cities', methods=['GET'])
def list_cities():
    return jsonify({'available_cities': list(data_files.keys())})

@app.route('/data/<city>', methods=['GET'])
def get_city_data(city):
    city = city.upper()
    if city not in data_files:
        return jsonify({'error': 'City not found'}), 404

    df = data_files[city].copy()

    # Normalize column names to expected keys
    column_mapping = {
        'PROP_NAME': 'name',
        'PROP_HEADING': 'name',
        'LOCATION': 'location',
        'Price (in Lakhs)': 'price_lakhs',
        'PRICE': 'price_lakhs',
        'MAX_PRICE': 'price_lakhs',
        'BHK': 'bhk',
        'Bedrooms': 'bhk',
        'AREA': 'area_sqft',
        'Area': 'area_sqft',
        'Area (in sqft)': 'area_sqft',
        'MIN_AREA_SQFT': 'area_sqft',
        'IMAGE_URL': 'image_url',
        'Image URL': 'image_url',
        'image_url': 'image_url',
    }
    property_type = df.get("property_type", "").strip().lower()

    if property_type and property_type != "all types":
        results = [
        p for p in results 
        if p.get("property_type", "").strip().lower() == property_type
    ]

    # Rename only if columns exist
    actual_mapping = {k: v for k, v in column_mapping.items() if k in df.columns}
    df = df.rename(columns=actual_mapping)

    filters = request.args.to_dict()

    # Validate and extract 'limit' parameter
    try:
        limit = max(1, int(filters.pop('limit', 100)))
    except ValueError:
        return jsonify({'error': 'Invalid "limit" value'}), 400

    # Apply filtering based on URL query parameters
    for key, value in filters.items():
        if key in df.columns and value:
            df = df[df[key].astype(str).str.contains(value, case=False, na=False)]

    # Fill missing values
    df = df.fillna('N/A')

    # Ensure required columns are in final output, even if empty
    required_columns = ['name', 'location', 'price_lakhs', 'bhk', 'area_sqft', 'image_url']
    for col in required_columns:
        if col not in df.columns:
            df[col] = 'N/A'
    
    # Handle missing or invalid image URLs
    if 'image_url' not in df.columns or (df['image_url'] == 'N/A').all():
        df['image_url'] = [f'https://source.unsplash.com/random/300x200/?apartment,house&sig={i}'
                          for i in range(len(df))]
    else:
        df['image_url'] = df['image_url'].apply(
            lambda x: f'https://source.unsplash.com/random/300x200/?apartment,house&sig={hash(str(x))}'
            if x in ['N/A', '', None] or not isinstance(x, str) or not x.strip() else x
        )

    # Convert to dict for JSON response
    result = df.head(limit).to_dict(orient='records')
    
    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True)