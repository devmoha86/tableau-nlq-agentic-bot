import duckdb
import os
from dotenv import load_dotenv

# 1. Load the environment variables
load_dotenv()
md_token = os.getenv("MOTHERDUCK_TOKEN")

if not md_token:
    raise ValueError("❌ Please add MOTHERDUCK_TOKEN to your .env file.")

def setup_database():
    print("🔌 Connecting to MotherDuck Cloud (Default Instance)...")
    # Connect to the default MotherDuck endpoint first
    con = duckdb.connect(f'md:?motherduck_token={md_token}')
    
    print("🗄️ Creating and attaching to database 'tableau_poc'...")
    con.execute("CREATE DATABASE IF NOT EXISTS tableau_poc;")
    con.execute("USE tableau_poc;")
    
    print("⏳ Generating TPC-H dataset (approx 6 million rows)...")
    con.execute("INSTALL tpch;")
    con.execute("LOAD tpch;")
    con.execute("CALL dbgen(sf=1);")
    
    print("🏗️ Creating the Semantic View for the LLM...")
    view_sql = """
    CREATE OR REPLACE VIEW v_nlq_sales_performance AS 
    SELECT 
        o.o_orderkey AS order_id,
        o.o_orderdate AS order_date,
        c.c_mktsegment AS market_segment,
        n.n_name AS region_name,
        l.l_extendedprice AS gross_sales,
        l.l_discount AS discount_pct,
        (l.l_extendedprice * (1 - l.l_discount)) AS net_sales
    FROM lineitem l
    JOIN orders o ON l.l_orderkey = o.o_orderkey
    JOIN customer c ON o.o_custkey = c.c_custkey
    JOIN nation n ON c.c_nationkey = n.n_nationkey;
    """
    
    con.execute(view_sql)
    
    # Quick sanity check to prove it worked
    print("\n✅ View Created! Running a quick test query...")
    result = con.execute("SELECT region_name, SUM(net_sales) AS total_sales FROM v_nlq_sales_performance GROUP BY region_name LIMIT 3").df()
    print(result)
    
    print("\n🎉 Database setup complete. Your data is now in the cloud!")

if __name__ == "__main__":
    setup_database()