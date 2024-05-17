const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const multer = require('multer');

const app = express();
const path = require('path');

// Serve the "uploads" folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(cors({}));
app.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "fooddelivery",
    port: 3306
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // This is where the images will be stored
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`; // Ensure unique filenames
        cb(null, uniqueName);
    },
});

const upload = multer({ storage });

db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err);
        return; // Stop further execution if there's an error
    }
    console.log("MySQL connected successfully.");
    const createTables = `
    CREATE TABLE IF NOT EXISTS users (
        ID INT AUTO_INCREMENT PRIMARY KEY,
        NAME VARCHAR(100) NOT NULL,
        EMAIL VARCHAR(100) NOT NULL UNIQUE,
        PASSWORD VARCHAR(255) NOT NULL,
        PHONENUMBER VARCHAR(15) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admins (
        ID INT AUTO_INCREMENT PRIMARY KEY,
        NAME VARCHAR(100) NOT NULL,
        EMAIL VARCHAR(100) NOT NULL UNIQUE,
        PASSWORD VARCHAR(255) NOT NULL,
        PHONENUMBER VARCHAR(15) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
        ITEM_ID INT AUTO_INCREMENT PRIMARY KEY,
        ITEM_NAME VARCHAR(100) NOT NULL,
        DESCRIPTION TEXT NOT NULL,
        PRICE DECIMAL(10, 2) NOT NULL,
        IMAGE VARCHAR(255) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cart (
        CART_ID INT AUTO_INCREMENT PRIMARY KEY,
        USER_ID INT NOT NULL,
        ITEM_ID INT NOT NULL,
        NO_OF_ITEMS INT NOT NULL,
        PRICE DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (USER_ID) REFERENCES users(ID),
        FOREIGN KEY (ITEM_ID) REFERENCES items(ITEM_ID)
    );

    CREATE TABLE IF NOT EXISTS orders (
        ORDER_ID INT AUTO_INCREMENT PRIMARY KEY,
        CUSTOMER_ID INT NOT NULL,
        ITEM_ID INT NOT NULL,
        ADDRESS VARCHAR(255) NOT NULL,
        NO_OF_ITEMS INT NOT NULL,
        PRICE DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (CUSTOMER_ID) REFERENCES users(ID),
        FOREIGN KEY (ITEM_ID) REFERENCES items(ITEM_ID)
    );

    CREATE TABLE IF NOT EXISTS sales (
        SALE_ID INT AUTO_INCREMENT PRIMARY KEY,
        ITEM_ID INT NOT NULL,
        NO_OF_ITEMS INT NOT NULL,
        PRICE DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (ITEM_ID) REFERENCES items(ITEM_ID)
    );
`;

    // Split the createTables string into separate SQL statements
    const sqlStatements = createTables.split(';').filter(statement => statement.trim() !== '');

    // Execute each SQL statement individually
    sqlStatements.forEach(sql => {
        db.query(sql, (err, result) => {
            if (err) throw err;
            console.log("Table created or already exists.");
        });
    });


});

app.post('/fooddelivery/add-user', (req, res) => {
    const { UserName, Email, Password, PhoneNumber } = req.body;

    const sql = "INSERT INTO users (NAME, EMAIL, PASSWORD, PHONENUMBER) VALUES (?, ?, ?, ?)";
    const values = [UserName, Email, Password, PhoneNumber];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error adding user:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        // Retrieve the ID of the newly inserted user
        const userId = result.insertId; // MySQL returns the last inserted ID

        res.status(200).json({ userId }); // Return the user ID
    });
});

// Function to check if an email exists

// Function to get user data based on email
app.get("/fooddelivery/get-user", (req, res) => {
    const email = req.query.Email; // Use query parameters for GET requests
    console.log("Getting user by email:", email); // Debug log
    const sql = "SELECT * FROM users WHERE EMAIL = ?";

    db.query(sql, [email], (err, result) => {
        if (err) {
            console.error("Error retrieving user:", err); // Log error
            return res.status(500).json({ error: "Internal Server Error" });
        }

        console.log("Query result:", result); // Debug log

        if (result.length > 0) {
            const user = result[0];
            console.log("User found:", user); // Log the user details
            res.status(200).json({
                exists: true,
                User: {
                    ID: user.ID,
                    Name: user.NAME,
                    Email: user.EMAIL,
                    PhoneNumber: user.PHONENUMBER,
                    Password: user.PASSWORD,
                },
            });
        } else {
            res.status(200).json({ exists: false }); // No user found
        }
    });
});
app.get("/fooddelivery/admin-login", (req, res) => {
    console.log(req.query);
    const name = req.query.Username; // Use query parameters for GET requests
    console.log("Getting admin by username:", name); // Debug log
    const sql = "SELECT * FROM admins WHERE NAME = ?";

    db.query(sql, [name], (err, result) => {
        if (err) {
            console.error("Error retrieving user:", err); // Log error
            return res.status(500).json({ error: "Internal Server Error" });
        }

        console.log("Query result:", result); // Debug log

        if (result.length > 0) {
            const user = result[0];
            console.log("User found:", user); // Log the user details
            res.status(200).json({
                exists: true,
                User: {
                    ID: user.ID,
                    Name: user.NAME,
                    Email: user.EMAIL,
                    PhoneNumber: user.PHONENUMBER,
                    Password: user.PASSWORD,
                },
            });
        } else {
            res.status(200).json({ exists: false }); // No user found
        }
    });
});

app.post('/fooddelivery/add-item', upload.single('itemPic'), (req, res) => {
    const { ItemName, Description, Price } = req.body;
    const imagePath = req.file.path; // Path to the uploaded image

    const sql = "INSERT INTO items (ITEM_NAME, DESCRIPTION, PRICE, IMAGE) VALUES (?, ?, ?, ?)";
    const values = [ItemName, Description, Price, imagePath];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error inserting data:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }
        res.status(200).json({ message: "Item added successfully" });
    });
});


app.put('/fooddelivery/edit-item/:id', multer().single('itemPic'), (req, res) => {
    const { id } = req.params;
    const { ItemName, Description, Price } = req.body;

    const sql = "UPDATE items SET ITEM_NAME = ?, DESCRIPTION = ?, PRICE = ? WHERE ITEM_ID = ?";
    const values = [ItemName, Description, Price, id];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error updating items:", err);
            return res.status(500).json({ error: "internal Server Error" });
        }
        res.status(200).json({ message: "Item updated successfully" });
    })
})

// Endpoint for deleting item
app.delete('/fooddelivery/delete-item/:id', (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM items WHERE ITEM_ID = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Error deleting item:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }
        res.status(200).json({ message: "Item deleted successfully" });
    });
});

// Endpoint for fetching all items
app.get('/fooddelivery/get-items', (req, res) => {

    const sql = "SELECT * FROM items"; // Query to fetch all items

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching items:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        res.status(200).json({ items: result }); // Return the items in a JSON format
    });
});

app.get('/fooddelivery/get-item/:id', (req, res) => {
    const sql = "SELECT * FROM items WHERE ITEM_ID= ?"; // Query to fetch all items
    const { id } = req.params;
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Error fetching items:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        res.status(200).json(result[0]); // Return the items in a JSON format
    });
});


app.post('/fooddelivery/add-to-sales/', (req, res) => {
    const sql = "INSERT INTO sales (ITEM_ID,NO_OF_ITEMS,PRICE) VALUES (?,?,?)";
    const values = [
        req.body.ItemId,
        req.body.No_of_items,
        req.body.Price
    ]; // Change to use 'id' from params, matching the URL pattern

    db.query(sql, values, (error, result) => {
        if (error) {
            console.error("Error inserting data:", error);
            return res.status(500).json({ message: "Error adding item to sales" });
        }
        res.status(200).json({ message: "Item successfully added to sales" });
    });
});


app.get('/fooddelivery/get-sales', (req, res) => {
    const sql = "SELECT * FROM sales s join items i on i.ITEM_ID=s.ITEM_ID";
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching sales:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }
        console.log("Sales fetched correctly");
        console.log(result);
        res.status(200).json({ sales: result }); // Return the items in a JSON format
    })
})

app.post('/fooddelivery/add-cart', (req, res) => {
    const sql = "INSERT INTO cart(USER_ID,ITEM_ID,NO_OF_ITEMS,PRICE) VALUES (?,?,?,?)";
    const values = [
        req.body.UserId,
        req.body.ItemId,
        req.body.NoOfItems,
        req.body.Price
    ]

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error inserting data into cart :", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }
        res.status(200).json({ message: "Added  to cart Successfully" });
    })
})
app.get('/fooddelivery/get-cart', (req, res) => {
    const sql = "SELECT C.ITEM_ID,C.CART_ID,I.ITEM_NAME, I.DESCRIPTION, I.IMAGE, I.PRICE, C.NO_OF_ITEMS FROM cart C JOIN items I ON I.ITEM_ID = C.ITEM_ID WHERE C.USER_ID = ?";
    const userId = req.query.userId; // Use query string parameter to get user ID

    db.query(sql, [userId], (err, result) => { // Correct parameter order
        if (err) {
            console.error("Error fetching cart:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        res.status(200).json({ cart: result }); // Return the cart data
    });
});

app.delete('/fooddelivery/delete-cart-item/:id', (req, res) => {
    const { id } = req.params; // Extract 'id' from URL parameter

    const sql = "DELETE FROM cart WHERE CART_ID = ?"; // Correct SQL syntax
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Error deleting cart item:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        if (result.affectedRows > 0) { // Check if any rows were deleted
            res.status(200).json({ message: "Cart item deleted successfully" });
        } else {
            res.status(404).json({ error: "Cart item not found" }); // Return 404 if no rows deleted
        }
    });
});


app.post('/fooddelivery/add-order', (req, res) => {
    const values = [
        req.body.UserId,
        req.body.ItemId,
        req.body.Address,
        req.body.NoOfItems,
        req.body.Price,
    ];
    const sql = "INSERT INTO orders (CUSTOMER_ID,ITEM_ID,ADDRESS,NO_OF_ITEMS,PRICE) VALUES(?,?,?,?,?)";
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error adding Order item:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        if (result.affectedRows > 0) {
            res.status(200).json({ message: " Order deleted successfully" });
        }
    });

})

app.get('/fooddelivery/get-user-orders', (req, res) => {
    const sql = "SELECT * FROM orders O join items I ON I.ITEM_ID = O.ITEM_ID WHERE CUSTOMER_ID = (?) ";
    const userId = req.query.UserId;
    db.query(sql, [userId], (err, result) => { // Correct parameter order
        if (err) {
            console.error("Error fetching orders:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        res.status(200).json({ orders: result }); // Return the cart data
    });

})

app.get('/fooddelivery/get-orders', (req, res) => {
    const sql = "SELECT * FROM orders O join items I ON I.ITEM_ID = O.ITEM_ID JOIN users U ON U.ID = O.CUSTOMER_ID";
    db.query(sql, (err, result) => { // Correct parameter order
        if (err) {
            console.error("Error fetching orders:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        res.status(200).json({ orders: result }); // Return the cart data
    });

})




app.listen(8082, () => {
    console.log("Server is running on port 8081");
});
