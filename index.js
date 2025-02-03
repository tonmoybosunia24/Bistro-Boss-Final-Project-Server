const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


// MiddleWare
app.use(cors());
app.use(express.json())

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

              app.get('/menu', async (req, res) => {
                     const result = await menuCollections.find().toArray();
                     res.send(result)
              })
              app.get('/reviews', async (req, res) => {
                     const result = await reviewsCollections.find().toArray();
                     res.send(result)
              })

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