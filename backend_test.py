import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class TrainSystemTester:
    def __init__(self, base_url="https://periodization-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.current_user = None
        self.test_athlete_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health"""
        success, _ = self.run_test("Health Check", "GET", "", 200)
        return success

    def test_register(self):
        """Test user registration"""
        test_email = f"test_coach_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!",
                "name": "Test Coach",
                "role": "coach"
            }
        )
        if success and 'id' in response:
            self.current_user = response
            return True, test_email
        return False, None

    def test_login(self, email, password="TestPass123!"):
        """Test user login and get token"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.current_user = response['user']
            return True
        return False

    def test_get_me(self):
        """Test get current user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        return success and 'id' in response

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        return success and 'athletes_count' in response

    def test_create_athlete(self):
        """Test creating an athlete"""
        athlete_data = {
            "name": "Test Athlete",
            "email": "athlete@test.com",
            "sport": "football",
            "age": 25,
            "level": "Intermedio",
            "notes": "Test athlete for API testing"
        }
        success, response = self.run_test(
            "Create Athlete",
            "POST",
            "athletes",
            200,
            data=athlete_data
        )
        if success and 'id' in response:
            self.test_athlete_id = response['id']
            return True
        return False

    def test_get_athletes(self):
        """Test getting athletes list"""
        success, response = self.run_test(
            "Get Athletes",
            "GET",
            "athletes",
            200
        )
        return success and isinstance(response, list)

    def test_get_athlete(self):
        """Test getting a specific athlete"""
        if not self.test_athlete_id:
            print("⚠️  Skipping athlete get test - no test athlete ID")
            return True
        
        success, response = self.run_test(
            "Get Specific Athlete",
            "GET",
            f"athletes/{self.test_athlete_id}",
            200
        )
        return success and 'id' in response

    def test_exercises_operations(self):
        """Test exercises endpoints"""
        # Get exercises
        success1, _ = self.run_test(
            "Get Exercises",
            "GET",
            "exercises",
            200
        )

        # Create custom exercise
        exercise_data = {
            "name": "Test Exercise",
            "sport": "football",
            "category": "fuerza",
            "description": "Test exercise for API testing",
            "muscles": ["quadriceps", "glutes"]
        }
        success2, _ = self.run_test(
            "Create Exercise",
            "POST",
            "exercises",
            200,
            data=exercise_data
        )

        return success1 and success2

    def test_seed_exercises(self):
        """Test seeding default exercises"""
        success, response = self.run_test(
            "Seed Exercises",
            "POST",
            "seed/exercises",
            200
        )
        return success and 'message' in response

    def test_training_plan_generation(self):
        """Test AI training plan generation"""
        if not self.test_athlete_id:
            print("⚠️  Skipping plan generation test - no test athlete ID")
            return True

        plan_request = {
            "athlete_id": self.test_athlete_id,
            "sport": "football",
            "planning_model": "traditional",
            "duration_weeks": 4,
            "objective": "Mejorar resistencia cardiovascular",
            "current_level": "Intermedio",
            "available_days_per_week": 4,
            "competitions": []
        }
        success, response = self.run_test(
            "Generate Training Plan with AI",
            "POST",
            "plans/generate",
            200,
            data=plan_request
        )
        return success and 'plan' in response

    def test_macrocycle_operations(self):
        """Test macrocycle CRUD operations"""
        if not self.test_athlete_id:
            print("⚠️  Skipping macrocycle test - no test athlete ID")
            return True

        # Create macrocycle
        macro_data = {
            "name": "Test Macrocycle",
            "start_date": "2025-01-01",
            "end_date": "2025-12-31",
            "sport": "football",
            "planning_model": "traditional",
            "objective": "Season preparation"
        }
        
        success, response = self.run_test(
            "Create Macrocycle",
            "POST",
            f"macrocycles?athlete_id={self.test_athlete_id}",
            200,
            data=macro_data
        )
        
        if success and 'id' in response:
            macro_id = response['id']
            
            # Get macrocycles
            success2, _ = self.run_test(
                "Get Macrocycles",
                "GET",
                "macrocycles",
                200
            )
            
            # Get specific macrocycle
            success3, _ = self.run_test(
                "Get Specific Macrocycle",
                "GET",
                f"macrocycles/{macro_id}",
                200
            )
            
            return success and success2 and success3
        
        return success

    def test_payment_endpoints(self):
        """Test payment-related endpoints"""
        # Test checkout creation
        checkout_data = {
            "plan": "basic",
            "origin_url": "https://test.com"
        }
        success, response = self.run_test(
            "Create Checkout Session",
            "POST",
            "payments/checkout",
            200,
            data=checkout_data
        )
        return success and 'url' in response

    def run_full_test_suite(self):
        """Run complete test suite"""
        print("🚀 Starting Sistema TRAIN API Test Suite")
        print("=" * 60)

        # Step 1: Health check
        if not self.test_health_check():
            print("❌ Health check failed, stopping tests")
            return False

        # Step 2: User registration and authentication
        register_success, test_email = self.test_register()
        if not register_success:
            print("❌ Registration failed, stopping tests")
            return False

        if not self.test_login(test_email):
            print("❌ Login failed, stopping tests")
            return False

        if not self.test_get_me():
            print("❌ Get user profile failed")

        # Step 3: Dashboard
        if not self.test_dashboard_stats():
            print("❌ Dashboard stats failed")

        # Step 4: Athletes management
        if not self.test_create_athlete():
            print("❌ Create athlete failed")

        if not self.test_get_athletes():
            print("❌ Get athletes failed")

        self.test_get_athlete()

        # Step 5: Exercises
        if not self.test_seed_exercises():
            print("❌ Seed exercises failed")

        if not self.test_exercises_operations():
            print("❌ Exercises operations failed")

        # Step 6: AI Plan Generation
        self.test_training_plan_generation()

        # Step 7: Training structure
        self.test_macrocycle_operations()

        # Step 8: Payments
        self.test_payment_endpoints()

        # Results
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed ({success_rate:.1f}%)")
        
        if success_rate >= 80:
            print("✅ API tests mostly successful")
            return True
        else:
            print("❌ API tests failed - multiple issues found")
            return False

def main():
    print("Sistema TRAIN - Backend API Testing")
    print("Testing against: https://periodization-hub.preview.emergentagent.com")
    
    tester = TrainSystemTester()
    success = tester.run_full_test_suite()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())