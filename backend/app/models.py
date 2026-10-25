from pydantic import BaseModel
from typing import List, Optional, Any

class StoreProfile(BaseModel):
    id: str
    name: str
    slug: str
    tagline: Optional[str] = ""
    accentColor: Optional[str] = "#6366f1"
    currencySymbol: Optional[str] = "$"
    announcement: Optional[str] = ""
    showAnnouncement: Optional[bool] = False
    bannerImage: Optional[str] = ""
    contactEmail: Optional[str] = ""
    phone: Optional[str] = ""

class ProductItem(BaseModel):
    id: str
    title: str
    price: float
    category: Optional[str] = "General"
    description: Optional[str] = ""
    images: Optional[List[str]] = []
    stock: Optional[int] = 10
    featured: Optional[bool] = False
    sku: Optional[str] = ""
    tags: Optional[List[str]] = []
    isRentable: Optional[bool] = False
    rentalPrice: Optional[float] = None
    rentalPeriod: Optional[str] = None
    listingType: Optional[str] = "buy"
    is_rentable: Optional[bool] = False
    rental_price: Optional[float] = None
    rental_period: Optional[str] = None
    listing_type: Optional[str] = "buy"
    minRentalDuration: Optional[int] = 1
    min_rental_duration: Optional[int] = 1
    securityDeposit: Optional[float] = None
    security_deposit: Optional[float] = None
    rentalTerms: Optional[str] = None
    rental_terms: Optional[str] = None

class OrderItem(BaseModel):
    productId: str
    title: str
    price: float
    quantity: Optional[int] = 1
    cartMode: Optional[str] = "buy"

class OrderCreate(BaseModel):
    customerName: str
    customerEmail: str
    customerPhone: Optional[str] = ""
    shippingAddress: Optional[str] = ""
    items: List[OrderItem]
    totalAmount: float
    notes: Optional[str] = ""

class OrderResponse(BaseModel):
    id: str
    status: str
    message: str
    createdAt: str
