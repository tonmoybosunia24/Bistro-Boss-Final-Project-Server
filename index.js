const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bodyParser = require('body-parser');
const nodeMailer = require('nodemailer');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


// MiddleWare
app.use(cors());
app.use(express.json())
app.use(bodyParser.json())

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4vklw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
       serverApi: {
              version: ServerApiVersion.v1,
              strict: true,
              deprecationErrors: true,
       }
});

async function run() {
       try {
              // Connect the client to the server (optional starting in v4.7)
              await client.connect();

              // Connect to the MongoDB Database
              const menuCollections = client.db('Final-Project').collection('menu')
              const reviewsCollections = client.db('Final-Project').collection('reviews')
              const cartsCollections = client.db('Final-Project').collection('carts')

              app.get('/menu', async (req, res) => {
                     const result = await menuCollections.find().toArray();
                     res.send(result)
              })
              app.get('/reviews', async (req, res) => {
                     const result = await reviewsCollections.find().toArray();
                     res.send(result)
              })

              // Add to Cart Collections

              app.get('/cart', async (req, res) => {
                     const email = req.query.email;
                     const query = { email: email }
                     const result = await cartsCollections.find(query).toArray();
                     res.send(result)
              })
              app.post('/cart', async (req, res) => {
                     const cartItem = req.body;
                     const result = await cartsCollections.insertOne(cartItem);
                     res.send(result)
              })


              // Email Sending
              app.post("/send-email", async (req, res) => {
                     const { name, email, phone, message } = req.body;

                     // Nodemailer transporter তৈরি
                     const transporter = nodeMailer.createTransport({
                            service: "gmail",
                            auth: {
                                   user: process.env.EMAIL_USER,
                                   pass: process.env.EMAIL_PASS,
                            },
                     });

                     // Email কনফিগার
                     const mailOptions = {
                            from: email,
                            to: process.env.EMAIL_USER,
                            subject: "New Contact Form Submission",
                            text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`,
                     };

                     try {
                            await transporter.sendMail(mailOptions);
                            res.status(200).json({ success: true, message: "Email sent successfully!" });
                     } catch (error) {
                            res.status(500).json({ success: false, message: "Failed to send email", error });
                     }
              });

              // Send a ping to confirm a successful connection
              await client.db("admin").command({ ping: 1 });
              console.log("Pinged your deployment. You successfully connected to MongoDB!");
       } finally {
              // Ensures that the client will close when you finish/error
              // await client.close();
       }
}
run().catch(console.dir);

app.get('/', (req, res) => {
       res.send('My Final Project Server is Running')
})

app.listen(port, () => {
       console.log(`Server Is Running On Port ${port}`)
})