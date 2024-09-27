from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to restrict allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load OpenAI API key from environment variable
client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)

class ColumnInfo(BaseModel):
    name: str
    type: str
    sample: str

# Define request and response models
class QueryRequest(BaseModel):
    prompt: str
    columns_info: list[ColumnInfo]

class QueryResponse(BaseModel):
    vega_lite_spec: str
    chart_description: str

@app.post("/query", response_model=QueryResponse)
async def query_openai(request: QueryRequest):
    try:
        # Step 1: Construct the prompt for Vega-Lite generation
        constructed_prompt = construct_vega_lite_prompt(request.prompt, request.columns_info)

        # Step 2: Call OpenAI API to generate Vega-Lite specification
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful data science assistant that generates accurate Vega-Lite specifications from user questions and dataset information.",
                },
                {
                    "role": "user",
                    "content": constructed_prompt,
                }
            ],
            model="gpt-3.5-turbo",
        )

        # Try accessing the completion's content correctly
        try:
            vega_lite_spec = chat_completion.choices[0].message.content
        except KeyError as e:
            raise HTTPException(status_code=500, detail=f"KeyError: {str(e)} in response: {chat_completion}")

        # Step 4: Chain another prompt for chart description
        description_prompt = construct_chart_description_prompt(vega_lite_spec)

        description_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that explains data visualizations clearly.",
                },
                {
                    "role": "user",
                    "content": description_prompt,
                }
            ],
            model="gpt-3.5-turbo",
        )

        # Try accessing the description content correctly
        try:
            chart_description = description_completion.choices[0].message.content
        except KeyError as e:
            raise HTTPException(status_code=500, detail=f"KeyError: {str(e)} in response: {description_completion}")

        # Step 6: Return both Vega-Lite specification and description
        return QueryResponse(
            vega_lite_spec=vega_lite_spec,
            chart_description=chart_description,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

def construct_vega_lite_prompt(user_question, columns_info):
    # Prepare dataset information for the prompt with column names, types, and sample values
    columns = [
        f"{col.name} (Type: {col.type}, Sample: {col.sample})" for col in columns_info
    ]
    
    # Construct the prompt for Vega-Lite JSON specification generation
    prompt = f"""
    You are a helpful data science assistant that generates accurate and valid Vega-Lite JSON specifications from user questions and dataset information. You should have a valid JSON specification each time.

    Based on the following dataset information:
    
    Columns: {', '.join(columns)}

    Please generate a valid Vega-Lite JSON specification for the following question: "{user_question}"
    
    Remember to choose the most appropriate chart type based on the data and question. Also, handle any necessary data transformations (such as filtering, aggregation, or binning) that the chart might require.

    Provide only the Vega-Lite JSON spec in your response.
    """
    return prompt

def construct_chart_description_prompt(vega_lite_spec):
    # Construct the prompt to generate a description of the Vega-Lite chart
    prompt = f"""
    You are a helpful assistant that explains data visualizations clearly.

    Based on the following Vega-Lite chart specification, provide a simple and clear description (one to two sentences) of the chart and what insights it conveys:

    Vega-Lite Spec: {vega_lite_spec}

    """
    
    return prompt

# Root endpoint
@app.get("/")
async def read_root():
    return FileResponse('static/index.html')

app.mount("/static", StaticFiles(directory="static"), name="static")