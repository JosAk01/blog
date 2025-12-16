const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const pool = require('../models/User');
const { isAuthenticated, authorize } = require('../middlewares/auth');

// Helper function to generate slug
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Home Page
router.get('/', async (req, res) => {
  try {
    const [blogs] = await pool.query(`
      SELECT b.*, u.name as author_name, 
             (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = b.id) as comment_count
      FROM blogs b 
      LEFT JOIN users u ON b.author_id = u.id 
      WHERE b.status = 'published' 
      ORDER BY b.created_at DESC 
      LIMIT 10
    `);
    
    res.render('index', { blogs, session: req.session });
  } catch (err) {
    console.error('Error loading home page:', err);
    res.status(500).send('Error loading page');
  }
});

// Login Page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Signup Page
router.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// About Page
router.get('/about', (req, res) => {
  res.render('about', { session: req.session });
});

// Signup Logic
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;

    await pool.query(query, [name, email, hashedPassword]);
    res.redirect('/login');
  } catch (err) {
    console.error('Error creating user:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      res.render('signup', { error: 'Email already in use' });
    } else {
      res.render('signup', { error: 'Server error' });
    }
  }
});

// Login Logic
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = `SELECT * FROM users WHERE email = ?`;
    const [results] = await pool.query(query, [email]);

    if (results.length === 0) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
      res.redirect(`/${user.role}`);
    } else {
      res.render('login', { error: 'Invalid email or password' });
    }
  } catch (err) {
    console.error('Error logging in:', err);
    res.render('login', { error: 'Server error' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// ====================== ADMIN ROUTES ======================
router.get('/admin', isAuthenticated, authorize('admin'), async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM blogs) as total_blogs,
        (SELECT COUNT(*) FROM blogs WHERE status = 'published') as published_blogs,
        (SELECT COUNT(*) FROM comments) as total_comments
    `);
    
    res.render('admin', { session: req.session, stats: stats[0] });
  } catch (err) {
    console.error('Error loading admin dashboard:', err);
    res.status(500).send('Error loading dashboard');
  }
});

// Admin - Manage Users
router.get('/admin/users', isAuthenticated, authorize('admin'), async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.render('admin-users', { session: req.session, users });
  } catch (err) {
    console.error('Error loading users:', err);
    res.status(500).send('Error loading users');
  }
});

// Admin - Delete User
router.post('/admin/users/:id/delete', isAuthenticated, authorize('admin'), async (req, res) => {
  const userId = req.params.id;
  
  if (userId == req.session.user.id) {
    return res.status(400).send('Cannot delete yourself');
  }

  try {
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).send('Error deleting user');
  }
});

// Admin - Update User Role
router.post('/admin/users/:id/role', isAuthenticated, authorize('admin'), async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  if (userId == req.session.user.id) {
    return res.status(400).send('Cannot change your own role');
  }

  try {
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).send('Error updating role');
  }
});

// Admin - View All Blogs
router.get('/admin/blogs', isAuthenticated, authorize('admin'), async (req, res) => {
  try {
    const [blogs] = await pool.query(`
      SELECT b.*, u.name as author_name,
             (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = b.id) as comment_count
      FROM blogs b 
      LEFT JOIN users u ON b.author_id = u.id 
      ORDER BY b.created_at DESC
    `);
    
    res.render('admin-blogs', { session: req.session, blogs });
  } catch (err) {
    console.error('Error loading blogs:', err);
    res.status(500).send('Error loading blogs');
  }
});

// Admin - Delete Blog
router.post('/admin/blogs/:id/delete', isAuthenticated, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM blogs WHERE id = ?', [req.params.id]);
    res.redirect('/admin/blogs');
  } catch (err) {
    console.error('Error deleting blog:', err);
    res.status(500).send('Error deleting blog');
  }
});

// ====================== AUTHOR ROUTES ======================
router.get('/author', isAuthenticated, authorize('author'), async (req, res) => {
  try {
    const [blogs] = await pool.query(`
      SELECT b.*,
             (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = b.id) as comment_count
      FROM blogs b 
      WHERE b.author_id = ? 
      ORDER BY b.created_at DESC
    `, [req.session.user.id]);
    
    const stats = {
      total_posts: blogs.length,
      published: blogs.filter(b => b.status === 'published').length,
      drafts: blogs.filter(b => b.status === 'draft').length,
      total_likes: blogs.reduce((sum, b) => sum + parseInt(b.like_count || 0), 0),
      total_comments: blogs.reduce((sum, b) => sum + parseInt(b.comment_count || 0), 0)
    };
    
    res.render('author', { session: req.session, blogs, stats });
  } catch (err) {
    console.error('Error loading author dashboard:', err);
    res.status(500).send('Error loading dashboard');
  }
});

// Author - Create Blog Page
router.get('/author/create', isAuthenticated, authorize('author'), (req, res) => {
  res.render('author-create', { session: req.session, blog: null, error: null });
});

// Author - Create Blog Logic
router.post('/author/create', isAuthenticated, authorize('author'), async (req, res) => {
  const { title, content, category, tags, status } = req.body;
  
  try {
    const slug = generateSlug(title);
    
    await pool.query(
      'INSERT INTO blogs (title, slug, content, category, author_id, status, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, slug, content, category, req.session.user.id, status || 'draft', tags || '']
    );
    
    res.redirect('/author');
  } catch (err) {
    console.error('Error creating blog:', err);
    res.render('author-create', { 
      session: req.session, 
      blog: req.body, 
      error: err.code === 'ER_DUP_ENTRY' ? 'A blog with this title already exists' : 'Error creating blog'
    });
  }
});

// Author - Edit Blog Page
router.get('/author/edit/:id', isAuthenticated, authorize('author'), async (req, res) => {
  try {
    const [blogs] = await pool.query('SELECT * FROM blogs WHERE id = ? AND author_id = ?', [req.params.id, req.session.user.id]);
    
    if (blogs.length === 0) {
      return res.status(404).send('Blog not found');
    }
    
    res.render('author-edit', { session: req.session, blog: blogs[0], error: null });
  } catch (err) {
    console.error('Error loading blog:', err);
    res.status(500).send('Error loading blog');
  }
});

// Author - Update Blog Logic
router.post('/author/edit/:id', isAuthenticated, authorize('author'), async (req, res) => {
  const { title, content, category, tags, status } = req.body;
  
  try {
    const slug = generateSlug(title);
    
    await pool.query(
      'UPDATE blogs SET title = ?, slug = ?, content = ?, category = ?, tags = ?, status = ? WHERE id = ? AND author_id = ?',
      [title, slug, content, category, tags || '', status || 'draft', req.params.id, req.session.user.id]
    );
    
    res.redirect('/author');
  } catch (err) {
    console.error('Error updating blog:', err);
    const [blogs] = await pool.query('SELECT * FROM blogs WHERE id = ?', [req.params.id]);
    res.render('author-edit', { 
      session: req.session, 
      blog: blogs[0], 
      error: 'Error updating blog'
    });
  }
});

// Author - Delete Blog
router.post('/author/delete/:id', isAuthenticated, authorize('author'), async (req, res) => {
  try {
    await pool.query('DELETE FROM blogs WHERE id = ? AND author_id = ?', [req.params.id, req.session.user.id]);
    res.redirect('/author');
  } catch (err) {
    console.error('Error deleting blog:', err);
    res.status(500).send('Error deleting blog');
  }
});

// ====================== USER ROUTES ======================
router.get('/user', isAuthenticated, authorize('user'), async (req, res) => {
  try {
    const [blogs] = await pool.query(`
      SELECT b.*, u.name as author_name,
             (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = b.id) as comment_count,
             (SELECT COUNT(*) FROM likes WHERE blog_id = b.id AND user_id = ?) as user_liked
      FROM blogs b 
      LEFT JOIN users u ON b.author_id = u.id 
      WHERE b.status = 'published' 
      ORDER BY b.created_at DESC
    `, [req.session.user.id]);

    res.render('user', { session: req.session, blogs });
  } catch (err) {
    console.error('Error loading blogs:', err);
    res.status(500).send('Error loading blogs');
  }
});

// Calendar Page (all roles)
router.get('/calendar', isAuthenticated, (req, res) => {
  res.render('calendar', { session: req.session });
});

// ====================== BLOG DETAIL & INTERACTIONS ======================
// View Blog Detail
router.get('/blog/:slug', async (req, res) => {
  try {
    const [blogs] = await pool.query(`
      SELECT b.*, u.name as author_name,
             (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = b.id) as comment_count
      FROM blogs b 
      LEFT JOIN users u ON b.author_id = u.id 
      WHERE b.slug = ?
    `, [req.params.slug]);

    if (blogs.length === 0) {
      return res.status(404).render('404');
    }

    const blog = blogs[0];
    
    // Get comments
    const [comments] = await pool.query(`
      SELECT c.*, u.name as user_name 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.post_id = ? 
      ORDER BY c.created_at DESC
    `, [blog.id]);

    // Check if user liked
    let userLiked = false;
    if (req.session.user) {
      const [likes] = await pool.query(
        'SELECT id FROM likes WHERE blog_id = ? AND user_id = ?',
        [blog.id, req.session.user.id]
      );
      userLiked = likes.length > 0;
    }

    res.render('blog-detail', { blog, comments, userLiked, session: req.session });
  } catch (err) {
    console.error('Error loading blog:', err);
    res.status(500).send('Error loading blog');
  }
});

// Like/Unlike Blog
router.post('/blog/:id/like', isAuthenticated, async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT id FROM likes WHERE blog_id = ? AND user_id = ?',
      [req.params.id, req.session.user.id]
    );

    if (existing.length > 0) {
      // Unlike
      await pool.query('DELETE FROM likes WHERE blog_id = ? AND user_id = ?', 
        [req.params.id, req.session.user.id]);
    } else {
      // Like
      await pool.query('INSERT INTO likes (blog_id, user_id) VALUES (?, ?)', 
        [req.params.id, req.session.user.id]);
    }

    const [result] = await pool.query('SELECT COUNT(*) as count FROM likes WHERE blog_id = ?', [req.params.id]);
    res.json({ success: true, likes: result[0].count, liked: existing.length === 0 });
  } catch (err) {
    console.error('Error toggling like:', err);
    res.status(500).json({ error: 'Error processing like' });
  }
});

// Add Comment
router.post('/blog/:id/comment', isAuthenticated, async (req, res) => {
  const { comment } = req.body;
  
  try {
    await pool.query(
      'INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)',
      [req.params.id, req.session.user.id, comment]
    );
    
    const [blogs] = await pool.query('SELECT slug FROM blogs WHERE id = ?', [req.params.id]);
    res.redirect(`/blog/${blogs[0].slug}`);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).send('Error adding comment');
  }
});

// User Settings Page
router.get('/user/settings', isAuthenticated, authorize('user'), (req, res) => {
  res.render('user-settings', { session: req.session, error: null, success: null });
});

// Update User Settings
router.post('/user/settings/update', isAuthenticated, authorize('user'), async (req, res) => {
  const { name, email, password } = req.body;
  const userId = req.session.user.id;

  try {
    if (password && password.length > 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?', 
        [name, email, hashedPassword, userId]);
    } else {
      await pool.query('UPDATE users SET name = ?, email = ? WHERE id = ?', 
        [name, email, userId]);
    }

    req.session.user.name = name;
    req.session.user.email = email;

    res.render('user-settings', { 
      session: req.session, 
      error: null, 
      success: 'Settings updated successfully!' 
    });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.render('user-settings', { 
      session: req.session, 
      error: 'Error updating settings', 
      success: null 
    });
  }
});

module.exports = router;