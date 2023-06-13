


const jwt = require('jsonwebtoken');
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
// jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.LM_STRIPE_SECRET_KEY);


// middle wares 
const corsConfig = {
  origin: "*",
  credential: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
}
app.use(cors(corsConfig));

// app.use(cors());
app.use(express.json());

// const language = require("./language.json")

const verifyJWT = (req, res, next)=>{
  const authorization = req.headers.authorization;

  if(!authorization){
    return res.status(401).send({error: true, message: "Unauthorized access"});
  }

  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.LM_ACCESS_SECRET, function(err, decoded) {
    if(err){
      return res.status(401).send({error: true, message: "Unauthorized access"});
    }

    req.decoded = decoded;
    next();
  });
}



app.get("/", (req, res) => {
  res.send("Assignment 12 is running");
})



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { status } = require("express/lib/response");
const uri = `mongodb+srv://${process.env.LM_USER}:${process.env.LM_PASS}@cluster0.bna95n2.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("LanguageMasterDB");
    const LMInstructors = database.collection("LMInstructors");
    const LMCourses = database.collection("LMCourses");
    const LMUserCarts = database.collection("LMUserCarts");
    const LMPaymentHistory = database.collection("LMPaymentHistory");

    // JWT 
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.LM_ACCESS_SECRET, { expiresIn: '1h' });
      res.send(token);
    })

    // user and instructors  regular route 
    app.get("/instructors", async (req, res) => {
      const query = { designation: "Instructor" };
      const cursor = LMInstructors.find(query);
      const instructors = await cursor.toArray();
      res.send(instructors);
    })

    app.post("/user", async (req, res) => {
      const user = req.body;
      const query = { email: user.email }

      const existingUser = await LMInstructors.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exist!" });
      }

      const result = await LMInstructors.insertOne(user);
      // console.log(user)
      res.send(result)

    })

    app.get("/courses", async (req, res) => {

      if (req?.query?.sort) {
        const cursor = LMCourses.find().sort({ enrolled: req.query.sort })
        const courses = await cursor.toArray();
        res.send(courses);
      }
      else {
        const query = { status: "approved" };
        const cursor = LMCourses.find(query);
        const courses = await cursor.toArray();
        res.send(courses);
      }
    })

    //select to my cart 
    app.post("/course/:email", async (req, res) => {
      const cart = req.body;
      const result = await LMUserCarts.insertOne(cart);
      // console.log(cart)
      res.send(result)
    })

    app.delete("/course/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: new ObjectId(id) }

      const result = await LMUserCarts.deleteOne(query);
      // console.log(cart)
      res.send(result)
    })

    app.get("/my-selected-course", verifyJWT, async (req, res) => {
    // app.get("/my-selected-course", async (req, res) => {
      let query = req.query || {};

      // console.log(req.decoded.loggedUser.email);
      const decodedEmail = req?.decoded?.loggedUser?.email;
      if(query?.email != decodedEmail){
        return res.status(403).send({error: true, message: "Forbidden access"})
      }

      if (query) {
        query = { status: query.status, email: query.email };
      }

      const cursor = LMUserCarts.find(query);
      const courses = await cursor.toArray();
      res.send(courses);
    })



    // admin options------------
    //--------------------------
    app.get("/users", async (req, res) => {
      const query = {};

      const cursor = LMInstructors.find(query);
      const instructors = await cursor.toArray();
      res.send(instructors);
    })

    // update role 
    app.patch("/user/:email", async (req, res) => {
      const email = req.params.email;
      const role = req.body.role;
      // console.log(email, role)


      const filter = { email: email };
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          designation: role
        },
      };
      const result = await LMInstructors.updateOne(filter, updateDoc, options);
      res.send(result)

    })

    // admin class 
    app.get("/classes", async (req, res) => {
      const query = {};

      const cursor = LMCourses.find(query);
      const classes = await cursor.toArray();
      res.send(classes);
    })

    // update status
    app.patch("/class/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      // console.log(id, status)


      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          status: status
        },
      };
      const result = await LMCourses.updateOne(filter, updateDoc, options);
      res.send(result)
    })

    // Instructor options ------------
    // -------------------------------------
    app.post("/add-class", async (req, res) => {
      const newClass = req.body;
      // console.log(newClass)

      const result = await LMCourses.insertOne(newClass);
      res.send(result);
    })

    // single class data by id 
    app.get("/class/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }

      const result = await LMCourses.findOne(query)
      res.send(result);
      // console.log("hit",id, result)
    })

    // update a class 
    app.patch("/update-class/:id", async (req, res) => {
      const id = req.params.id;
      const newClass = req.body;
      // console.log("new", newClass)


      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          image: newClass.image,
          price: newClass.price,
          name: newClass.name,
          availableSeats: newClass.availableSeats
        },
      };
      const result = await LMCourses.updateOne(filter, updateDoc, options);
      res.send(result)
    })


    // after payment update enrolled 
    app.patch("/course/:id", async (req, res) => {
      const id = req.params.id;
      const newClass = req.body;
      // console.log("new", newClass)
      
      const oldData = await LMCourses.findOne({_id: new ObjectId(id)})
      const oldCart = await LMUserCarts.findOne({_id: new ObjectId(newClass.id)})

      if(oldData.availableSeats == oldData.enrolled){
        return res.send("No seat available");
      }

      const filterCart = { _id: new ObjectId(newClass.id) };
      const optionsCart = { upsert: true };
      const updateCart = {
        $set: {
          status: "paid"
        },
      };
      const resultCart = await LMUserCarts.updateOne(filterCart, updateCart, optionsCart);
      // res.send(resultCart)
      // console.log(resultCart)

      // console.log(oldData)

      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          enrolled: oldData.enrolled+1
        },
      };
      const result = await LMCourses.updateOne(filter, updateDoc, options);
      res.send({result, resultCart})
      // console.log(result)
    })

    app.patch("/course-feedback/:id", async (req, res) => {
      const id = req.params.id;
      const newClass = req.body;
      // console.log("new", newClass)


      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          feedback: newClass.feedback
        },
      };
      const result = await LMCourses.updateOne(filter, updateDoc, options);
      res.send(result)
    })


    //------------------
    //-----find a user to know is he admin
    //--------------------------
    app.get("/check-user/:email", async(req, res)=>{
      const email = req.params.email;
      // console.log("email", email)

      const query = {email: email}
      const result = await LMInstructors.findOne(query)
      res.send(result);
    })

    // single cart data 
    app.get("/single-cart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }

      const result = await LMUserCarts.findOne(query)
      res.send(result);
      // console.log("hit",id, result)
    })


    //************************** */
    //******---Stripe Payment intent---********* */
    //************************** */

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = price;
      if(!amount){
        return res.status(404).send({error: true, message: "price not found!"})
      }

      // console.log(amount)
    
      // Create a PaymentIntent with the order amount and currency

        const paymentIntent = await stripe.paymentIntents.create({
          // amount: amount*100 ,
          amount: parseInt(amount*100, 10),
          currency: "usd",
          payment_method_types: ['card']
        });
      
        res.send({
          clientSecret: paymentIntent.client_secret,
        });


      })

      // payment history 
      app.get("/payment-history/:email", async(req, res)=>{
        const sortOP = req?.headers?.sort || 1;
        // console.log(sortOP)

        const cursor = LMPaymentHistory.find({email: req?.params?.email}).sort({ date: sortOP, time: sortOP });
        const result = await cursor.toArray();
        res.send(result)
        console.log(result)
      })

      // add payment history 
      app.post("/payment-history/:email", async (req, res) => {
        const cart = req.body;
        const result = await LMPaymentHistory.insertOne(cart);
        // console.log(cart)
        // res.send(result)
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




// app.get("/language", (req, res)=>{
//   res.send(language)
// })

app.listen(port, () => {
  console.log("Assignment 12 is running on port: ", port)
})