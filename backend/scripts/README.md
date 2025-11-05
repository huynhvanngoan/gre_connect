# Database Seeding Scripts

This directory contains scripts for seeding the database with sample data in English.

## Available Scripts

### Reset Database
```bash
npm run reset:db
# Or keep users:
npm run reset:db:keep-users
```

### Seed Individual Collections
```bash
npm run seed:users      # Seed users (teachers, students, staff)
npm run seed:classes   # Seed classes (requires users)
npm run seed:posts     # Seed posts (requires users and classes)
npm run seed:comments  # Seed comments (requires users and posts)
npm run seed:messages  # Seed messages and conversations (requires users)
```

### Seed All Data
```bash
npm run seed:all       # Seed all collections in order
```

### Reset and Seed
```bash
npm run reset:and:seed # Reset database and seed all data
```

## Seed Order

The scripts should be run in this order:
1. `seedUsers.js` - Creates teachers, students, and staff
2. `seedClasses.js` - Creates classes with teachers and students
3. `seedPosts.js` - Creates posts (announcements, homework, discussions)
4. `seedComments.js` - Creates comments on posts
5. `seedMessages.js` - Creates conversations and messages

## Data Included

### Users
- 3 Teachers (Math, Science, English)
- 5 Students (various grades)
- 1 Staff (Admin)

### Classes
- Algebra I (Math)
- Biology Fundamentals (Science)
- English Literature (English)

### Posts
- Announcements
- Homework assignments
- Discussion posts
- General posts

### Comments
- Text comments on posts
- Nested replies

### Messages
- Direct conversations
- Group conversations
- Sample messages

All data is in English and designed for educational purposes.

