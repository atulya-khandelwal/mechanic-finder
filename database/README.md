# Database Setup

## Prerequisites
- PostgreSQL 12+ installed
- Create a database: `createdb mobile_mechanic`

## Setup Steps

1. Create the database:
   ```bash
   createdb mobile_mechanic
   ```

2. Run the schema:
   ```bash
   psql -d mobile_mechanic -f schema.sql
   ```

3. (Optional) Run seed data:
   ```bash
   psql -d mobile_mechanic -f seed.sql
   ```

4. For existing databases, run the booking details migration:
   ```bash
   psql -d your_database -f migration-booking-details.sql
   ```

## Connection String
```
postgresql://username:password@localhost:5432/mobile_mechanic
```

Update `backend/.env` with your credentials.
