const express = require('express');
const app = express();
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const dbPath = path.join(__dirname, './userInfo.db');
const multer = require('multer');

app.use(express.json());
app.use(cors());

const port = 3004;

let db;

const initializeTheDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(port, () => console.log(`Server running at port ${port}`));
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};

initializeTheDbAndServer();

// Signup user Api

app.post('/signup', async (req, res) => {
  const { userDetails } = req.body;
  const { username, password, email, phone } = userDetails;

  try {
    const selectUserQuery = `SELECT * FROM userinfo WHERE email = '${email}'`;
    const dbUser = await db.get(selectUserQuery);
    console.log(dbUser);
    if (dbUser === undefined) {
      if (username.trim().length === 0) {
        res.status(400).send('Enter valid username!');
      } else if (!email.endsWith('@gmail.com')) {
        res.status(400).send('Enter valid email!');
      } else if (phone.length !== 10) {
        res.status(400).send('Enter valid number!');
      } else if (password.length < 8) {
        res.status(400).send('Password length is too short!');
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);

        const createUserQuery = `
              INSERT INTO 
                userinfo (username, email, password, phome) 
              VALUES 
                (
                  '${username}', 
                  '${email}',
                  '${hashedPassword}', 
                  '${phone}'
                )`;
        const dbResponse = await db.run(createUserQuery);
        const newUserId = dbResponse.lastID;
        res.status(201).send(`Created new user with ${newUserId}`);
      }
    } else {
      res.status(400).send('User already exists');
    }
  } catch (error) {
    console.log(`Error during signup: $${error.message}`);
    res.status(500).send(`Internal Server Error`);
  }
});

// Login User Api

app.post('/login', async (req, res) => {
  const { userDetails } = req.body;
  const { email, password } = userDetails;

  try {
    const selectUserQuery = `SELECT * FROM userinfo WHERE email = '${email}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser !== undefined) {
      const comparePassword = await bcrypt.compare(password, dbUser.password);
      console.log(comparePassword);
      if (comparePassword) {
        const payload = {
          username: email,
        };
        const jwtToken = jwt.sign(payload, 'Naveenk24');
        console.log(jwtToken);
        res.status(200).send({ jwtToken });
      } else {
        res.status(400).send('Enter valid password!');
      }
    } else {
      if (email.length === 0) {
        res.status(400).send('Enter email!');
      } else {
        res.status(400).send('Invalid user!');
      }
    }
  } catch (error) {
    console.log(`Error during signup: $${error.message}`);
    res.status(500).send(`Internal Server Error`);
  }
});

// Image And Blog uploading

app.use(express.static(__dirname));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), async (req, res) => {
  const { title, summary, content, category } = req.body;
  console.log(req.body);
  console.log(category);
  const fileUrl = req.file
    ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    : null;

  const uploadBlogQuery = `
    INSERT INTO blogs (
      title,
      summary,
      image,
      content,
      category
    ) VALUES (
     '${title}',
     '${summary}',
     '${
       fileUrl === null
         ? 'http://localhost:3004/uploads/1724593379516.jpg'
         : fileUrl
     }',
     '${content}',
     '${category}'
  ); `;

  await db.run(uploadBlogQuery);
  res.send('upload successfully');
});

// Get Blogs Api

app.get('/', async (req, res) => {
  const getBlogs = `
    SELECT *
    FROM blogs
  `;
  const data = await db.all(getBlogs);
  res.send(data);
});

// Get a single Blog Api

app.get('/:id', async (req, res) => {
  const { id } = req.params;
  const getBlogs = `
    SELECT *
    FROM blogs
    WHERE id= ${id}
  `;
  const data = await db.get(getBlogs);
  res.send(data);
});

// Update Blog Api

app.put('/edit/:id', upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const { title, summary, content, category } = req.body;
  const fileUrl = req.file
    ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    : null;

  console.log(fileUrl);

  const updateBlog = `
    UPDATE blogs
    SET title = '${title}',
      summary = '${summary}',
      image = '${
        fileUrl === null
          ? 'http://localhost:3004/uploads/1724593379516.jpg'
          : fileUrl
      }',
      content = '${content}',
      category = '${category}'
    WHERE id = ${id};
  `;

  await db.run(updateBlog);
  res.send('Updated Successfully');
});

// Delete The Blog

app.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;
  const getBlogs = `
    DELETE FROM blogs
    WHERE id= ${id}
  `;
  const data = await db.get(getBlogs);
  res.send(data);
});
