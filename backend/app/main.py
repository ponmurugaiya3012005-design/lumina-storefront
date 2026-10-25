import os
import json
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import StoreProfile, ProductItem, OrderCreate, OrderResponse

app = FastAPI(
    title="Lumina Studio Storefront API",
    description="Dedicated FastAPI Backend for Lumina Studio storefront",
    version="1.0.0"
)

# CORS setup to allow Next.js frontend on Vercel and local dev
cors_env = os.getenv("CORS_ORIGINS", "*").strip()
if cors_env == "*" or not cors_env:
    allow_origins = ["*"]
else:
    allow_origins = [o.strip() for o in cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store Profile Configuration
STORE_CONFIG = {'id': 'gem-artisan-studio', 'name': 'Lumina Studio', 'slug': 'lumina', 'tagline': 'Handcrafted lighting & ceramic vessels crafted in limited batches.', 'accentColor': '#6366f1', 'currencySymbol': '₹', 'announcement': '🎉 Spring Studio Collection is live — Free worldwide courier over $150', 'showAnnouncement': True, 'contactEmail': 'elena@luminastudio.com', 'phone': '+1 (555) 382-9102'}

# Supabase Client if configured via runtime environment variables
supa_client = None
supa_url = os.getenv("SUPABASE_URL", "").strip()
supa_key = (
    os.getenv("SUPABASE_SECRET_KEY", "").strip()
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    or os.getenv("SUPABASE_ANON_KEY", "").strip()
)

if supa_url and supa_key:
    try:
        from supabase import create_client
        supa_client = create_client(supa_url, supa_key)
    except Exception as e:
        print(f"Supabase client init note: {e}")

def normalize_product_dict(row: dict) -> dict:
    item = dict(row)
    is_rent = item.get("is_rentable")
    if is_rent is None:
        is_rent = item.get("isRentable", False)

    list_type = item.get("listing_type") or item.get("listingType")
    if not list_type:
        list_type = "rent" if is_rent else "buy"

    rent_price = item.get("rental_price")
    if rent_price is None:
        rent_price = item.get("rentalPrice")

    rent_period = item.get("rental_period") or item.get("rentalPeriod") or "day"
    min_dur = item.get("min_rental_duration") or item.get("minRentalDuration") or 1
    sec_dep = item.get("security_deposit") if item.get("security_deposit") is not None else item.get("securityDeposit")
    rent_terms = item.get("rental_terms") or item.get("rentalTerms")

    item["isRentable"] = bool(is_rent)
    item["is_rentable"] = bool(is_rent)
    item["listingType"] = list_type
    item["listing_type"] = list_type
    item["rentalPrice"] = rent_price
    item["rental_price"] = rent_price
    item["rentalPeriod"] = rent_period
    item["rental_period"] = rent_period
    item["minRentalDuration"] = min_dur
    item["min_rental_duration"] = min_dur
    item["securityDeposit"] = sec_dep
    item["security_deposit"] = sec_dep
    item["rentalTerms"] = rent_terms
    item["rental_terms"] = rent_terms
    return item

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Lumina Studio Storefront API",
        "runtime": "Python FastAPI",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/store", response_model=StoreProfile)
def get_store():
    return STORE_CONFIG

@app.get("/api/products", response_model=List[ProductItem])
def get_products(category: Optional[str] = None):
    if not supa_client:
        return []

    try:
        query = supa_client.from_("products").select("*").eq("store_id", "gem-artisan-studio")
        if category and category != "All":
            query = query.eq("category", category)
        res = query.execute()
        return [normalize_product_dict(p) for p in (res.data or [])]
    except Exception as e:
        print(f"Supabase products query error: {e}")
        return []

@app.get("/api/products/{product_id}", response_model=ProductItem)
def get_product(product_id: str):
    if not supa_client:
        raise HTTPException(status_code=404, detail="Product not found (Supabase not configured)")

    try:
        res = supa_client.from_("products").select("*").eq("id", product_id).execute()
        if res.data and len(res.data) > 0:
            return normalize_product_dict(res.data[0])
    except Exception as e:
        print(f"Supabase get_product error: {e}")

    raise HTTPException(status_code=404, detail="Product not found")

@app.post("/api/orders", response_model=OrderResponse)
def create_order(order: OrderCreate):
    if not supa_client:
        raise HTTPException(status_code=503, detail="Order creation unavailable: Supabase database is not connected")

    order_id = str(uuid.uuid4())[:8].upper()
    created_at = datetime.utcnow().isoformat()

    try:
        supa_client.from_("orders").insert({
            "id": order_id,
            "store_id": "gem-artisan-studio",
            "customer_name": order.customerName,
            "customer_email": order.customerEmail,
            "customer_phone": order.customerPhone,
            "shipping_address": order.shippingAddress,
            "items": [item.dict() for item in order.items],
            "total_amount": order.totalAmount,
            "notes": order.notes,
            "status": "pending",
            "created_at": created_at,
        }).execute()
    except Exception as e:
        print(f"Supabase order insertion error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to record order: {str(e)}")

    return OrderResponse(
        id=order_id,
        status="confirmed",
        message=f"Order #{order_id} placed successfully for {order.customerName}!",
        createdAt=created_at
    )
