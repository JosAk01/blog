# 📝 Multi-Role Blog Platform

A full-featured blog web application built with **Node.js**, **Express**, **MySQL**, and **EJS**. It supports **role-based access control** for Admins, Editors, and Users.

---

## 🚀 Features

- 🛡️ **Role-Based Access Control (RBAC)** – Three roles:
  - **Admin**: Full control (manage users, roles, posts)
  - **Editor**: Create, edit, and delete posts
  - **User**: Read published content only
- 🔐 **User Authentication & Session Management** (Express sessions + bcrypt)
- 📄 **Full Blog CRUD** (Create, Read, Update, Delete)
- 🎯 **Access Middleware** to protect routes by role
- 📚 MySQL-powered relational data structure for users, roles, permissions, and posts
- ✨ Clean frontend interface using **EJS templating** + Bootstrap
- 🛠️ Input validation and flash messaging for better user experience

---

## 🧑‍💻 Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Templating:** EJS
- **Auth:** express-session, bcrypt
- **Frontend:** HTML5, CSS3, Bootstrap, JavaScript

---

## 🏗️ Project Structure

```

📦 blog-app/
├── 📁 img/
├── 📁 middlewares/
├── 📁 models/
├── 📁 public/
├── 📁 routes/
├── 📁 views/
├── 📄 app.js
├── 📄 package.json
└── 📄 README.md

````

---

## 🔧 Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/JosAk01/blog.git
   cd blog.git
````

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure database:**

   * Create a MySQL database (e.g., `blog_app`)
   * Update your DB credentials in `config/database.js` or `.env`


5. **Start the server:**

   ```bash
   npm start
   ```

6. Visit `http://localhost:8000` in your browser.

---

## ✅ Future Improvements

* Add image upload for posts
* WYSIWYG editor for content creation
* Add email verification or notifications
* Implement rich dashboard for admin analytics

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork this repo and submit a pull request.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

```

