const express = require('express');
const app = express();
const cors = require('cors');
const jwt =require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const verifyJWT=(req,res,next)=>{
    const authorization=req.headers.authorization;
    if(!authorization){
        return res.status(401).send({error: true, message : 'unauthorized access'});
    }

    const token = authorization.split(' ')[1];


    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err, decoded)=>{
        if(err){
            return res.status(401).send({error: true, message : 'unauthorized access'});
        }

        req.decoded=decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s3cfwic.mongodb.net/?retryWrites=true&w=majority`;

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
        client.connect();

        const usersCollection = client.db('sportsDB').collection('users');
        const classesCollection = client.db('sportsDB').collection('classes');

        app.post('/jwt',(req,res)=>{
            const user=req.body;
            const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1hr'})

            res.send({token});
            
        })

        //classes related API
        app.post('/classes', async (req, res) => {
            const user = req.body;
            const result = await classesCollection.insertOne(user);
            res.send(result);
        });

        app.get('/classes',async(req,res)=>{
            const classes=await classesCollection.find().toArray();
            res.send(classes);
        })



        // Users related API
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
        // ...

        app.get('/users', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });

        // ...

         //verifying admin
        app.get('/users/admin/:email', verifyJWT ,async (req,res)=>{
            const email=req.params.email;
           
            if(req.decoded.email!== email){
                res.send({admin: false})
            }

            const query={email: email}
            const user=await usersCollection.findOne(query);
            const result={admin:user?.role==='admin'}
            res.send(result);
        })

        //verifying Instructor
        app.get('/users/instructor/:email', verifyJWT ,async (req,res)=>{
            const email=req.params.email;
           
            if(req.decoded.email!== email){
                res.send({instructor: false})
            }

            const query={email: email}
            const user=await usersCollection.findOne(query);
            const result={instructor:user?.role==='instructor'}
            res.send(result);
        })

        // Update user role as admin
        app.patch('/users/admin/:id',async (req,res)=>{
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
              $set: {
                role: 'admin'
              },
            };
      
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
       

         // Update user role as instructor
         app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});