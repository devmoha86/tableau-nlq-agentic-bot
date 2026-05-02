import os
import tableauserverclient as TSC
from dotenv import load_dotenv

# Load credentials
load_dotenv()
site_url = os.getenv("TABLEAU_SITE_URL")
site_name = os.getenv("TABLEAU_SITE_NAME")
pat_name = os.getenv("TABLEAU_PAT_NAME")
pat_secret = os.getenv("TABLEAU_PAT_SECRET")

def get_datasource_ids():
    print(f"🔌 Connecting to Admin API for site: {site_name}...")
    
    # 1. Set up Tableau Server Auth
    tableau_auth = TSC.PersonalAccessTokenAuth(
        token_name=pat_name, 
        personal_access_token=pat_secret, 
        site_id=site_name
    )
    
    # 2. Create the server object
    server = TSC.Server(site_url, use_server_version=True)
    
    with server.auth.sign_in(tableau_auth):
        print("✅ Authenticated successfully.\n")
        
        # 3. Query all data sources on the site
        all_datasources, pagination_item = server.datasources.get()
        
        print(f"{'DATA SOURCE NAME':<30} | {'ID'}")
        print("-" * 70)
        
        # 4. Print them out so you can copy the ID
        for ds in all_datasources:
            print(f"{ds.name:<30} | {ds.id}")

if __name__ == '__main__':
    get_datasource_ids()