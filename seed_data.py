import random
from datetime import datetime, timedelta

import requests

BASE_URL = "http://localhost:3000"


def post(url, data):
    try:
        r = requests.post(url, json=data)
        if r.status_code in [200, 201]:
            result = r.json()
            print(f"✅ Created: {url.split('/')[-1]} - Response type: {type(result)}")
            return result
        elif r.status_code == 409:
            print(f"⚠️ Already exists")
            return None
        else:
            print(f"❌ Failed ({r.status_code}): {r.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def get(url):
    try:
        r = requests.get(url)
        if r.status_code == 200:
            return r.json()
        else:
            print(f"❌ Failed to GET ({r.status_code}): {url}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


# Store created IDs for relationships
created_ids = {
    "addresses": [],
    "properties": [],
    "users": [],
    "rooms": [],
    "reservations": [],
    "invoices": [],
    "activities": [],
    "room_types": [],
    "amenities": [],
    "highlights": [],
    "roles": [],
    "payment_methods": [],
    "payment_status": [],
    "reservation_status": [],
    "invoice_status": [],
    "occurrence_status": [],
}


def fetch_lookup_ids():
    """Fetch existing lookup table IDs"""
    print("\n📋 Fetching lookup table IDs...")

    lookups = {
        "room_types": "/room/types",
        "amenities": "/amenities",
        "highlights": "/highlights",
        "roles": "/roles",
        "payment_methods": "/payment/methods",
        "payment_status": "/payment/status",
        "reservation_status": "/reservation/status",
        "invoice_status": "/invoice/status",
        "occurrence_status": "/occurrence/status",
    }

    for key, endpoint in lookups.items():
        data = get(f"{BASE_URL}{endpoint}")
        if data:
            created_ids[key] = [item["id"] for item in data]
            print(f"  ✓ Loaded {len(created_ids[key])} {key}")


def fetch_existing_activities():
    """Fetch existing activity IDs"""
    print("\n🎯 Fetching existing activities...")
    activities = get(f"{BASE_URL}/activities")
    if activities and isinstance(activities, list):
        for activity in activities:
            if "id" in activity:
                created_ids["activities"].append(activity["id"])
        print(f"   ✓ Found {len(created_ids['activities'])} existing activities")
    else:
        print("   ⚠️ No existing activities found")


def seed_activities():
    """Seed activities"""
    print("\n🎯 Seeding New Activities...")

    activities_data = [
        {"name": "Swimming Pool", "description": "Olympic-sized heated swimming pool"},
        {"name": "Spa & Wellness", "description": "Full-service spa with massage and treatments"},
        {"name": "Fitness Center", "description": "24/7 gym with modern equipment"},
        {"name": "Restaurant", "description": "On-site fine dining restaurant"},
        {"name": "Bar & Lounge", "description": "Cocktail bar and lounge area"},
        {"name": "Beach Access", "description": "Private beach access"},
        {"name": "Ski Rental", "description": "Ski equipment rental and storage"},
        {"name": "Concierge Service", "description": "24/7 concierge assistance"},
        {"name": "Room Service", "description": "24-hour room service"},
        {"name": "Conference Rooms", "description": "Business meeting and conference facilities"},
    ]

    for activity_data in activities_data:
        result = post(f"{BASE_URL}/activities", activity_data)
        if result:
            activity_id = None
            if isinstance(result, list) and len(result) > 0:
                activity_id = result[0].get("id")
            elif isinstance(result, dict) and "id" in result:
                activity_id = result["id"]
            
            if activity_id:
                created_ids["activities"].append(activity_id)
                print(f"   → Captured activity ID: {activity_id}")

    print(f"   ✓ Total new activities: {len(created_ids['activities'])}")


def seed_properties():
    """Seed properties with addresses"""
    print("\n🏨 Seeding Properties...")

    properties_data = [
        {
            "name": "Sunset Beach Resort",
            "description": "Luxury beachfront resort with stunning ocean views",
            "about": "Experience paradise at our exclusive beachfront property featuring world-class amenities and pristine beaches.",
            "email": "info@sunsetbeach.com",
            "phoneNumber": "+1-555-0101",
            "checkInTime": "15:00",
            "checkOutTime": "11:00",
            "address": {
                "street": "123 Ocean Drive",
                "city": "Miami Beach",
                "zipCode": "33139",
                "country": "USA",
            },
        },
        {
            "name": "Mountain View Lodge",
            "description": "Cozy mountain retreat perfect for winter getaways",
            "about": "Nestled in the heart of the mountains, our lodge offers breathtaking views and world-class skiing.",
            "email": "reservations@mountainview.com",
            "phoneNumber": "+1-555-0102",
            "checkInTime": "14:00",
            "checkOutTime": "10:00",
            "address": {
                "street": "456 Alpine Way",
                "city": "Aspen",
                "zipCode": "81611",
                "country": "USA",
            },
        },
        {
            "name": "Downtown City Hotel",
            "description": "Modern hotel in the heart of the city",
            "about": "Perfect for business travelers and tourists alike, with easy access to all major attractions.",
            "email": "contact@downtownhotel.com",
            "phoneNumber": "+1-555-0103",
            "checkInTime": "15:00",
            "checkOutTime": "12:00",
            "address": {
                "street": "789 Main Street",
                "city": "New York",
                "zipCode": "10001",
                "country": "USA",
            },
        },
    ]

    for prop_data in properties_data:
        result = post(f"{BASE_URL}/properties", prop_data)
        if result:
            print(f"   DEBUG: Property result = {result}")
            # Handle both array and single object responses
            if isinstance(result, list) and len(result) > 0:
                prop_id = result[0].get("id")
                if prop_id:
                    created_ids["properties"].append(prop_id)
                    print(f"   → Captured property ID: {prop_id}")
            elif isinstance(result, dict) and "id" in result:
                created_ids["properties"].append(result["id"])
                print(f"   → Captured property ID: {result['id']}")
            else:
                print(f"   ⚠️ Could not extract property ID from result")


def fetch_existing_users():
    """Try to login with known test users to get their IDs"""
    print("\n👥 Checking for existing users...")
    
    test_users = [
        {"email": "john.doe@example.com", "password": "password123"},
        {"email": "jane.smith@example.com", "password": "password123"},
        {"email": "bob.johnson@example.com", "password": "password123"},
        {"email": "alice.williams@example.com", "password": "password123"},
    ]
    
    for user_creds in test_users:
        try:
            r = requests.post(f"{BASE_URL}/auth/signin", json=user_creds)
            if r.status_code == 200:
                token = r.json().get("access_token")
                if token:
                    # Get user details with the token
                    headers = {"Authorization": f"Bearer {token}"}
                    user_response = requests.get(f"{BASE_URL}/users/me", headers=headers)
                    if user_response.status_code == 200:
                        user_data = user_response.json()
                        user_id = user_data.get("id")
                        if user_id and user_id not in created_ids["users"]:
                            created_ids["users"].append(user_id)
        except:
            pass
    
    if created_ids["users"]:
        print(f"   ✓ Found {len(created_ids['users'])} existing users")
    else:
        print("   ⚠️ No existing users found")


def seed_users():
    """Seed users with addresses and roles"""
    print("\n👥 Seeding New Users...")

    users_data = [
        {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@example.com",
            "password": "password123",
            "phone": "+1-555-1001",
            "address": {
                "street": "101 Maple Street",
                "city": "Boston",
                "zipCode": "02101",
                "country": "USA",
            },
        },
        {
            "firstName": "Jane",
            "lastName": "Smith",
            "email": "jane.smith@example.com",
            "password": "password123",
            "phone": "+1-555-1002",
            "address": {
                "street": "202 Oak Avenue",
                "city": "San Francisco",
                "zipCode": "94102",
                "country": "USA",
            },
        },
        {
            "firstName": "Bob",
            "lastName": "Johnson",
            "email": "bob.johnson@example.com",
            "password": "password123",
            "phone": "+1-555-1003",
            "address": {
                "street": "303 Pine Road",
                "city": "Seattle",
                "zipCode": "98101",
                "country": "USA",
            },
        },
        {
            "firstName": "Alice",
            "lastName": "Williams",
            "email": "alice.williams@example.com",
            "password": "password123",
            "phone": "+1-555-1004",
            "address": {
                "street": "404 Elm Boulevard",
                "city": "Chicago",
                "zipCode": "60601",
                "country": "USA",
            },
        },
    ]

    for user_data in users_data:
        result = post(f"{BASE_URL}/auth/signup", user_data)
        if result:
            # Handle different response formats
            user_id = None
            if isinstance(result, dict):
                if "user" in result and "id" in result["user"]:
                    user_id = result["user"]["id"]
                elif "id" in result:
                    user_id = result["id"]
            
            if user_id:
                created_ids["users"].append(user_id)
                print(f"   → Captured user ID: {user_id}")

                # Assign "Guest" role to each user
                if created_ids["roles"]:
                    guest_role_id = created_ids["roles"][-1]  # Assuming last role is "Guest"
                    post(
                        f"{BASE_URL}/user-roles",
                        {"userId": user_id, "roleId": guest_role_id},
                    )
            else:
                print(f"   ⚠️ Could not extract user ID from response: {result}")


def seed_rooms():
    """Seed rooms for each property"""
    print("\n🛏️ Seeding Rooms...")
    print(f"   DEBUG: Have {len(created_ids['properties'])} properties and {len(created_ids['room_types'])} room types")

    if not created_ids["properties"] or not created_ids["room_types"]:
        print("⚠️ Skipping rooms - no properties or room types available")
        return

    room_names = [
        ["Ocean Suite", "Beach Bungalow", "Sunset Villa", "Premium Ocean View"],
        ["Alpine Lodge", "Mountain Cabin", "Summit Suite", "Valley View Room"],
        ["City Suite", "Executive Room", "Penthouse", "Standard Room", "Deluxe Room"],
    ]

    for idx, property_id in enumerate(created_ids["properties"]):
        names = (
            room_names[idx] if idx < len(room_names) else ["Room A", "Room B", "Room C"]
        )

        for i, name in enumerate(names):
            room_data = {
                "propertyId": property_id,
                "roomTypeId": random.choice(created_ids["room_types"]),
                "name": name,
                "description": f"Beautiful {name.lower()} with modern amenities",
                "bedCount": random.randint(1, 3),
                "bathroomCount": random.randint(1, 2),
                "available": True,
            }

            result = post(f"{BASE_URL}/rooms", room_data)
            if result:
                if isinstance(result, list) and len(result) > 0:
                    room_id = result[0]["id"]
                    created_ids["rooms"].append(room_id)
                    print(f"   → Captured room ID: {room_id}")
                elif isinstance(result, dict) and "id" in result:
                    created_ids["rooms"].append(result["id"])
                    print(f"   → Captured room ID: {result['id']}")


def seed_room_prices():
    """Seed prices for rooms"""
    print("\n💰 Seeding Room Prices...")
    print(f"   DEBUG: Have {len(created_ids['rooms'])} rooms to price")

    if not created_ids["rooms"]:
        print("⚠️ Skipping room prices - no rooms available")
        return

    today = datetime.now()

    for room_id in created_ids["rooms"]:
        # Create seasonal prices
        seasons = [
            {"start": 0, "end": 90, "price": "150.00"},  # Low season
            {"start": 91, "end": 180, "price": "250.00"},  # Mid season
            {"start": 181, "end": 270, "price": "350.00"},  # High season
            {"start": 271, "end": 365, "price": "200.00"},  # Off season
        ]

        for season in seasons:
            start_date = (today + timedelta(days=season["start"])).strftime("%Y-%m-%d")
            end_date = (today + timedelta(days=season["end"])).strftime("%Y-%m-%d")

            price_data = {
                "roomId": room_id,
                "price": season["price"],
                "startDate": start_date,
                "endDate": end_date,
            }

            post(f"{BASE_URL}/room-prices", price_data)


def seed_room_amenities():
    """Assign amenities to rooms"""
    print("\n🛎️ Seeding Room Amenities...")

    if not created_ids["rooms"] or not created_ids["amenities"]:
        print("⚠️ Skipping room amenities - no rooms or amenities available")
        return

    for room_id in created_ids["rooms"]:
        # Assign 2-4 random amenities to each room
        num_amenities = random.randint(2, min(4, len(created_ids["amenities"])))
        selected_amenities = random.sample(created_ids["amenities"], num_amenities)

        for amenity_id in selected_amenities:
            post(
                f"{BASE_URL}/room-amenities",
                {"roomId": room_id, "amenityId": amenity_id},
            )


def seed_room_highlights():
    """Assign highlights to rooms"""
    print("\n⭐ Seeding Room Highlights...")

    if not created_ids["rooms"] or not created_ids["highlights"]:
        print("⚠️ Skipping room highlights - no rooms or highlights available")
        return

    for room_id in created_ids["rooms"]:
        # Assign 1-2 random highlights to each room
        num_highlights = random.randint(1, min(2, len(created_ids["highlights"])))
        selected_highlights = random.sample(created_ids["highlights"], num_highlights)

        for highlight_id in selected_highlights:
            post(
                f"{BASE_URL}/room-highlights",
                {"roomId": room_id, "highlightId": highlight_id},
            )


def seed_reservations():
    """Seed reservations"""
    print("\n📅 Seeding Reservations...")

    if (
        not created_ids["users"]
        or not created_ids["payment_status"]
        or not created_ids["reservation_status"]
    ):
        print("⚠️ Skipping reservations - missing required data")
        return

    today = datetime.now()

    for i in range(6):  # Create 6 reservations
        user_id = random.choice(created_ids["users"])

        reservation_data = {
            "userId": user_id,
            "statusId": random.choice(created_ids["reservation_status"]),
            "totalPrice": str(random.randint(300, 2000)) + ".00",
            "paymentStatusId": random.choice(created_ids["payment_status"]),
            "depositAmount": str(random.randint(50, 200)) + ".00",
            "specialRequests": random.choice(
                [
                    "Late check-in required",
                    "Need extra pillows",
                    "Vegetarian meals preferred",
                    None,
                ]
            ),
        }

        result = post(f"{BASE_URL}/reservations", reservation_data)
        if result:
            if isinstance(result, list) and len(result) > 0:
                res_id = result[0]["id"]
                created_ids["reservations"].append(res_id)
                print(f"   → Captured reservation ID: {res_id}")
            elif isinstance(result, dict) and "id" in result:
                created_ids["reservations"].append(result["id"])
                print(f"   → Captured reservation ID: {result['id']}")


def seed_reservation_rooms():
    """Link reservations to rooms"""
    print("\n🏨 Seeding Reservation-Rooms...")
    print(f"   DEBUG: Have {len(created_ids['reservations'])} reservations and {len(created_ids['rooms'])} rooms")

    if not created_ids["reservations"] or not created_ids["rooms"]:
        print("⚠️ Skipping reservation-rooms - no reservations or rooms available")
        return

    today = datetime.now()

    for reservation_id in created_ids["reservations"]:
        # Each reservation gets 1-2 rooms
        num_rooms = random.randint(1, min(2, len(created_ids["rooms"])))
        selected_rooms = random.sample(created_ids["rooms"], num_rooms)

        for room_id in selected_rooms:
            check_in_days = random.randint(5, 60)
            stay_duration = random.randint(2, 7)

            check_in = (today + timedelta(days=check_in_days)).strftime("%Y-%m-%d")
            check_out = (
                today + timedelta(days=check_in_days + stay_duration)
            ).strftime("%Y-%m-%d")

            reservation_room_data = {
                "roomId": room_id,
                "reservationId": reservation_id,
                "checkIn": check_in,
                "checkOut": check_out,
                "guestsCount": random.randint(1, 4),
            }

            post(f"{BASE_URL}/reservation-rooms", reservation_room_data)


def seed_invoices():
    """Seed invoices for reservations"""
    print("\n🧾 Seeding Invoices...")

    if not created_ids["reservations"] or not created_ids["invoice_status"]:
        print("⚠️ Skipping invoices - no reservations or invoice statuses available")
        return

    for reservation_id in created_ids["reservations"]:
        invoice_data = {
            "reservationId": reservation_id,
            "amount": str(random.randint(300, 2000)) + ".00",
            "statusId": random.choice(created_ids["invoice_status"]),
        }

        result = post(f"{BASE_URL}/invoices", invoice_data)
        if result:
            if isinstance(result, list) and len(result) > 0:
                inv_id = result[0]["id"]
                created_ids["invoices"].append(inv_id)
                print(f"   → Captured invoice ID: {inv_id}")
            elif isinstance(result, dict) and "id" in result:
                created_ids["invoices"].append(result["id"])
                print(f"   → Captured invoice ID: {result['id']}")


def seed_payments():
    """Seed payments for invoices"""
    print("\n💳 Seeding Payments...")

    if not created_ids["invoices"] or not created_ids["payment_methods"]:
        print("⚠️ Skipping payments - no invoices or payment methods available")
        return

    for invoice_id in created_ids["invoices"]:
        # Create 1-2 payments per invoice (split payments)
        num_payments = random.randint(1, 2)

        for _ in range(num_payments):
            payment_data = {
                "invoiceId": invoice_id,
                "amount": str(random.randint(100, 500)) + ".00",
                "paymentMethodId": random.choice(created_ids["payment_methods"]),
                "transactionId": f"TXN-{random.randint(100000, 999999)}",
            }

            post(f"{BASE_URL}/payments", payment_data)


def seed_activity_property():
    """Link activities to properties"""
    print("\n🎨 Seeding Activity-Property...")
    print(
        f"   DEBUG: Have {len(created_ids['activities'])} activities and {len(created_ids['properties'])} properties"
    )

    if not created_ids["activities"] or not created_ids["properties"]:
        print("⚠️ Skipping activity-property - no activities or properties available")
        return

    for property_id in created_ids["properties"]:
        # Each property gets 4-6 random activities
        num_activities = random.randint(4, min(6, len(created_ids["activities"])))
        selected_activities = random.sample(created_ids["activities"], num_activities)

        for activity_id in selected_activities:
            post(
                f"{BASE_URL}/activity-property",
                {"activityId": activity_id, "propertyId": property_id},
            )


def seed_occurrences():
    """Seed occurrences for reservations"""
    print("\n📝 Seeding Occurrences...")

    if not created_ids["reservations"] or not created_ids["occurrence_status"]:
        print(
            "⚠️ Skipping occurrences - no reservations or occurrence statuses available"
        )
        return

    occurrence_descriptions = [
        "Room temperature too low",
        "Requested room service",
        "Noise complaint from adjacent room",
        "Missing towels in bathroom",
        "TV remote not working",
        "Request for late checkout",
    ]

    # Create occurrences for some reservations (not all)
    for reservation_id in random.sample(
        created_ids["reservations"], min(4, len(created_ids["reservations"]))
    ):
        occurrence_data = {
            "reservationId": reservation_id,
            "description": random.choice(occurrence_descriptions),
            "statusId": random.choice(created_ids["occurrence_status"]),
        }

        post(f"{BASE_URL}/occurrences", occurrence_data)


def main():
    print("=" * 60)
    print("🌱 SEEDING APPLICATION DATA")
    print("=" * 60)

    # First, fetch all lookup table IDs
    fetch_lookup_ids()

    # Seed main tables in order of dependencies
    # Try to fetch existing activities first, then create new ones if needed
    fetch_existing_activities()
    if not created_ids["activities"]:
        seed_activities()
    
    seed_properties()
    seed_activity_property()
    
    # Try to fetch existing users first, then create new ones if needed
    fetch_existing_users()
    if not created_ids["users"]:
        seed_users()
    
    # If still no users, try one more approach - just use hardcoded IDs from previous runs
    if not created_ids["users"]:
        print("\n👥 Using hardcoded user IDs as fallback...")
        # Based on your output, users were created with IDs 3, 4, 5, 6
        created_ids["users"] = [3, 4, 5, 6]
        print(f"   ✓ Using {len(created_ids['users'])} fallback user IDs")
    
    seed_rooms()
    seed_room_prices()
    seed_room_amenities()
    seed_room_highlights()
    seed_reservations()
    seed_reservation_rooms()
    seed_invoices()
    seed_payments()
    seed_occurrences()

    print("\n" + "=" * 60)
    print("✅ SEEDING COMPLETED!")
    print("=" * 60)
    print(f"📊 Summary:")
    print(f"   - Activities: {len(created_ids['activities'])}")
    print(f"   - Properties: {len(created_ids['properties'])}")
    print(f"   - Users: {len(created_ids['users'])}")
    print(f"   - Rooms: {len(created_ids['rooms'])}")
    print(f"   - Reservations: {len(created_ids['reservations'])}")
    print(f"   - Invoices: {len(created_ids['invoices'])}")
    print("=" * 60)


if __name__ == "__main__":
    main()
