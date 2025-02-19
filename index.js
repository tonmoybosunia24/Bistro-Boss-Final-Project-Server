const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const bodyParser = require('body-parser');
const nodeMailer = require('nodemailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;


// MiddleWare
app.use(cors());
app.use(express.json())
app.use(bodyParser.json())
app.use(express.static("public"));

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
              const userCollections = client.db('Final-Project').collection('users')
              const menuCollections = client.db('Final-Project').collection('menu')
              const reviewsCollections = client.db('Final-Project').collection('reviews')
              const cartsCollections = client.db('Final-Project').collection('carts')
              const paymentCollections = client.db('Final-Project').collection('payments')
              const reservationCollections = client.db('Final-Project').collection('reservations')


              // Jwt Token Related APi
              app.post('/jwt', async (req, res) => {
                     const user = req.body;
                     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                            expiresIn: '1h'
                     })
                     res.send({ token });
              })

              // Verify TOken Middlewares
              const verifyToken = (req, res, next) => {
                     if (!req.headers.authorization) {
                            return res.status(401).send({ message: 'Unauthorized Access' });
                     }
                     const token = req.headers.authorization.split(' ')[1];
                     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                            if (err) {
                                   return res.status(401).send({ message: 'Unauthorized Access' })
                            }
                            req.decoded = decoded;
                            next();
                     })
              }

              // Use Verify Admin After Verify Token
              const verifyAdmin = async (req, res, next) => {
                     const email = req.decoded.email;
                     const query = { email: email };
                     const user = await userCollections.findOne(query)
                     const isAdmin = user?.role === 'Admin'
                     if (!isAdmin) {
                            return res.status(403).send({ message: 'Forbidden Access' })
                     }
                     next();
              }

              // Users Collection Apis
              app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
                     const result = await userCollections.find().toArray();
                     res.send(result)
              })
              app.post('/users', async (req, res) => {
                     const user = req.body;
                     // Insert User If User Doesn't Exist
                     // I Can Do This In Menu Way.(1.Unique Email, 2.Upsert, 3.Simple Checking)
                     const query = { email: user?.email }
                     const existingUser = await userCollections.findOne(query)
                     if (existingUser) {
                            return res.send({ Message: 'User Already Exist', insertedId: null })
                     }
                     const result = await userCollections.insertOne(user);
                     res.send(result);
              })
              app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
                     const id = req.params.id;
                     const filter = { _id: new ObjectId(id) };
                     const updateDoc = {
                            $set: {
                                   role: 'Admin',
                            },
                     };
                     const result = await userCollections.updateOne(filter, updateDoc)
                     res.send(result)
              })
              app.delete('/users/:id', async (req, res) => {
                     const id = req.params.id;
                     const query = { _id: new ObjectId(id) }
                     const result = await userCollections.deleteOne(query)
                     res.send(result)
              })

              // Admin APi
              app.get('/users/admin/:email', verifyToken, async (req, res) => {
                     const email = req.params.email;
                     if (email !== req.decoded?.email) {
                            return res.status(403).send({ message: 'Unauthorized Access' })
                     }
                     const query = { email: email };
                     const user = await userCollections.findOne(query)
                     let Admin = false;
                     if (user) {
                            Admin = user?.role === 'Admin'
                     }
                     res.send({ Admin })
              })

              // Collections Api
              // Menu Items Api
              app.get('/menu', async (req, res) => {
                     const result = await menuCollections.find().toArray();
                     res.send(result)
              })
              app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
                     const menuItem = req.body;
                     const result = await menuCollections.insertOne(menuItem)
                     res.send(result)
              })
              app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
                     const id = req.params.id;
                     const query = { _id: new ObjectId(id) }
                     const result = await menuCollections.deleteOne(query)
                     res.send(result)
              })
              app.get('/menu/:id', async (req, res) => {
                     const id = req.params.id;
                     const query = { _id: new ObjectId(id) };
                     const result = await menuCollections.findOne(query);
                     res.send(result)
              })
              app.patch('/menu/:id', async (req, res) => {
                     const item = req.body;
                     const id = req.params.id;
                     const filter = { _id: new ObjectId(id) };
                     const updateDoc = {
                            $set: {
                                   name: item.name,
                                   category: item.category,
                                   price: item.price,
                                   recipe: item.recipe,
                                   image: item.image,
                            },
                     };
                     const result = await menuCollections.updateOne(filter, updateDoc)
                     res.send(result)
              })
              // Reviews Related Api
              app.get('/reviews', async (req, res) => {
                     const result = await reviewsCollections.find().toArray();
                     res.send(result)
              })
              app.post('/reviews', async (req, res) => {
                     const reviewItem = req.body;
                     const result = await reviewsCollections.insertOne(reviewItem)
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
              });
              app.delete('/cart/:id', async (req, res) => {
                     const id = req.params.id;
                     const query = { _id: new ObjectId(id) }
                     const result = await cartsCollections.deleteOne(query)
                     res.send(result)
              })

              // Payment Intent
              app.post('/create-payment-intent', async (req, res) => {
                     const { price } = req.body;
                     if (!price) {
                            return res.status(400).send({ error: "Price is required" });
                     }
                     const amount = parseInt(price * 100);
                     const paymentIntent = await stripe.paymentIntents.create({
                            amount: amount,
                            currency: 'usd',
                            payment_method_types: ['card']
                     });
                     res.send({
                            clientSecret: paymentIntent.client_secret
                     })
              })
              app.get('/payments/:email', verifyToken, async (req, res) => {
                     const query = { email: req.params.email }
                     if (req.params.email != req.decoded.email) {
                            return res.status(403).send({ message: 'Forbidden Access' })
                     }
                     const result = await paymentCollections.find(query).toArray();
                     res.send(result)
              })
              app.post('/payments', async (req, res) => {
                     const payment = req.body;
                     const paymentResult = await paymentCollections.insertOne(payment)
                     const query = {
                            _id: {
                                   $in: payment.cartIds.map(id => new ObjectId(id))
                            }
                     }
                     const deleteResult = await cartsCollections.deleteMany(query)
                     res.send({ paymentResult, deleteResult })
              })

              // Admin Stats Or Analytics
              app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {

                     const users = await userCollections.estimatedDocumentCount();
                     const menuItems = await menuCollections.estimatedDocumentCount();
                     const orders = await paymentCollections.estimatedDocumentCount();

                     const result = await paymentCollections.aggregate([
                            {
                                   $group: {
                                          _id: null,
                                          totalRevenue: { $sum: '$price' }
                                   }
                            }
                     ]).toArray()
                     const revenue = result.length > 0 ? result[0].totalRevenue : 0;

                     res.send({
                            users,
                            menuItems,
                            orders,
                            revenue
                     })
              })

              // User Stats Or Analytics

              app.get('/user-stats/:email', verifyToken, async (req, res) => {
                     const email = req.params.email;
                     const totalOrders = await paymentCollections.countDocuments({ email });
                     const totalPayments = await paymentCollections.countDocuments({ email });
                     const totalReviews = await reviewsCollections.countDocuments({ email });
                     const totalBookings = await reservationCollections.countDocuments({ email });
                     res.send({
                            totalOrders,
                            totalPayments,
                            totalReviews,
                            totalBookings
                     })
              })

              // Using Aggregate Pipeline
              app.get('/order-stats', verifyToken, verifyAdmin, async (req, res) => {
                     try {
                            const result = await paymentCollections.aggregate([
                                   {
                                          $addFields: {
                                                 menuItemIds: {
                                                        $map: {
                                                               input: "$menuItemIds",
                                                               as: "id",
                                                               in: { $toObjectId: "$$id" }
                                                        }
                                                 }
                                          }
                                   },
                                   {
                                          $lookup: {
                                                 from: 'menu',
                                                 localField: 'menuItemIds',
                                                 foreignField: '_id',
                                                 as: 'menuItems'
                                          }
                                   },
                                   {
                                          $unwind: {
                                                 path: "$menuItems",
                                                 preserveNullAndEmptyArrays: true
                                          }
                                   },
                                   {
                                          $group: {
                                                 _id: "$menuItems.category",
                                                 category: { $first: "$menuItems.category" },
                                                 quantity: { $sum: 1 },
                                                 revenue: { $sum: "$menuItems.price" }
                                          }
                                   },
                                   {
                                          $match: { category: { $ne: null } },
                                   },
                                   {
                                          $project: {
                                                 _id: 0,
                                                 category: 1,
                                                 quantity: 1,
                                                 revenue: 1
                                          }
                                   }
                            ]).toArray();

                            res.send(result);
                     } catch (error) {
                            console.error("Error fetching order stats:", error);
                            res.status(500).send({ error: "Internal Server Error" });
                     }
              });



              // Reservation Related APi
              app.get('/reservation', async (req, res) => {
                     const result = await reservationCollections.find().toArray();
                     res.send(result)
              })
              app.get('/reservation/:email', verifyToken, async (req, res) => {
                     const query = { email: req.params.email }
                     if (req.params.email != req.decoded.email) {
                            return res.status(403).send({ message: 'Forbidden Access' })
                     }
                     const result = await reservationCollections.find(query).toArray();
                     res.send(result)
              })
              app.post('/reservation', async (req, res) => {
                     const reservation = req.body;
                     const result = await reservationCollections.insertOne(reservation)
                     res.send(result)
              })
              app.patch("/reservation/:id", async (req, res) => {
                     const id = req.params.id;
                     const filter = { _id: new ObjectId(id) };
                     const updateDoc = { $set: { status: "Done" } };
                     const result = await reservationCollections.updateOne(filter, updateDoc);
                     res.send(result);
              });


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