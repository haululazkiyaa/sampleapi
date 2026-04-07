# Sample API - CRUD Mahasiswa

Backend API sederhana dengan Node.js, Express, dan MongoDB untuk autentikasi JWT dan CRUD data mahasiswa.

## Fitur

- Register & Login (Bearer JWT, expired 1 hari)
- CRUD Mahasiswa
- Pagination + search + sorting pada endpoint list mahasiswa
- Validasi input lengkap
- Struktur response API konsisten
- Error handling terstandar + HTTP status code sesuai
- Security middleware: Helmet, CORS, rate limiting

## Menjalankan Project

1. Install dependency:

```bash
npm install
```

2. Buat file `.env` dari `.env.example` lalu isi nilainya.

3. Jalankan server development:

```bash
npm run dev
```

Base URL: `http://localhost:3000/api/v1`

## Endpoint

### Auth

- `POST /auth/register`
- `POST /auth/login`

### Students (perlu Bearer token)

- `GET /students?page=1&limit=10&search=&sortBy=createdAt&sortOrder=desc`
- `GET /students/:id`
- `POST /students`
- `PUT /students/:id`
- `DELETE /students/:id`

## Contoh Response Sukses

```json
{
  "success": true,
  "code": 200,
  "message": "Students fetched successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 0,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

## Contoh Response Error

```json
{
  "success": false,
  "code": 422,
  "message": "Validation failed",
  "errors": [
    {
      "field": "body.email",
      "message": "Invalid email address"
    }
  ]
}
```
