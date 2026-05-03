import os
from dotenv import load_dotenv

# --- Core LangChain/LangGraph Imports ---
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

# --- Official Tableau Langchain Imports ---
# This tool has the VizQL Data Service built-in!
from langchain_tableau.tools.simple_datasource_qa import initialize_simple_datasource_qa

# Load environment variables
load_dotenv()

def run_official_tableau_agent():
    print("🤖 Booting up the Official Tableau Data Agent...")
    
    # 1. Initialize the LLM (OpenAI)
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    
    # 2. Initialize the Tableau Datasource Query Tool
    # This automatically connects to Tableau and fetches your MotherDuck extract schema
    print("🔄 Connecting to Tableau VizQL Data Service...")
    analyze_datasource = initialize_simple_datasource_qa(
        domain=os.getenv("TABLEAU_SITE_URL"),
        site=os.getenv("TABLEAU_SITE_NAME"),
        datasource_luid=os.getenv("TABLEAU_DATASOURCE_ID"),
        jwt_client_id=os.getenv("TABLEAU_JWT_CLIENT_ID"),
        jwt_secret_id=os.getenv("TABLEAU_JWT_SECRET_ID"),
        jwt_secret=os.getenv("TABLEAU_JWT_SECRET"),
        tableau_user=os.getenv("TABLEAU_USER"),
        tableau_api_version=os.getenv("TABLEAU_API_VERSION"),
        tooling_llm_model=os.getenv("TOOLING_MODEL")
    )
    
    # 3. Build the Agent
    # We use LangGraph's pre-built ReAct agent, which handles the routing perfectly
    tools = [analyze_datasource]
    tableauAgent = create_react_agent(llm, tools)
    
    # 4. Execute the Query
    question = "What is the total net sales grouped by region name?"
    print(f"\n👤 User Question: {question}\n")
    print("-" * 50)
    
    # LangGraph expects the input as a list of messages
    response = tableauAgent.invoke({"messages": [("human", question)]})
    
    print("-" * 50)
    # The final answer is always the last message in the response array
    print(f"\n🤖 Final Answer:\n{response['messages'][-1].content}\n")

if __name__ == "__main__":
    run_official_tableau_agent()