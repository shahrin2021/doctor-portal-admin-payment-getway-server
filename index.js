const express = require('express');
const app = express();
const { MongoClient } = require('mongodb');
const port = process.env.PORT || 5000;
require('dotenv').config();
const cors = require('cors');
const  admin = require("firebase-admin");
const ObjectId = require('mongodb').ObjectId;
const stripe = require("stripe")(process.env.STRIPE_SECRET);
app.use(cors());
app.use(express.json());

//  pass :jq795eP3Ni9dxTuI  doctorPortal
// doctor-portal-service-firebase-adminsdk-33m53-ca6e4ec2c2



const  serviceAccount = require("./doctor-portal-service-firebase-adminsdk-33m53-ca6e4ec2c2");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hes3p.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

console.log(uri)

async function verifyToken(req, res, next){
if(req.headers.authorization?.startsWith('Bearer ')){
    const token = req.headers.authorization.split('')[1]

    try{
        const decodeteUser= await admin.auth().verifyIdToken(token);
        req.decodeteEmail = decodeteUser.email;
    }finally{

    }
}
next()
};

// 

async function run(){
    try{
        await client.connect()
        const database= client.db('doctors_portal');
        const appointmentCollection= database.collection('appointments');
        const usreCollection= database.collection('users')
        console.log('database connect');

        app.post('/appointments', async(req, res)=>{
            const appointment= req.body;
            const result = await appointmentCollection.insertOne(appointment)
            console.log(result)
            res.json({message:'hello'})
        })

        app.get('/appointments/:id', async(req,res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const appointment = await appointmentCollection.findOne(query)
            res.json(appointment)

        }) 

        app.get('/appointments', verifyToken, async(req, res)=>{
            const email = req.query.email;
            const date= new Date(req.query.date).toLocaleDateString();
              console.log(date)
            const query = {email:email,date: date}
            const cursor= appointmentCollection.find(query);
            const appointments = await cursor.toArray();
            res.json(appointments)
        });

        app.get('/users/:email', async(req, res)=>{
            const email= req.params.email;
            const query = {email: email}
            const user = await usreCollection.findOne(query);
            let isAdmin= false;
            if(user?.role=== 'admin'){
                isAdmin=true;
                
            }
            res.json({admin: isAdmin})
        })

        app.post('/users', async (req, res)=>{
            const users = req.body;
            const result = await usreCollection.insertOne(users);
            res.json(result)
        });

        app.put('/users', async (req , res)=>{
            const user = req.body;
            const filter = {email:user.email};
            const option= {upsert:true};
            const updateDoc= {
                $set:user
            }
            const result = await usreCollection.updateOne(filter, updateDoc, option);
            res.json(result)
        });

        app.put('/users/admin', verifyToken, async(req, res)=>{
            const user = req.body; 
            const requester = req.decodeteEmail;
            if(requester){
                const requesterAccunt= await usreCollection.findOne({email:requester});
                if(requesterAccunt === 'admin'){
                    
                    const filter = {email: user.email};
                    const updateDoc= {
                        $set:{role:'admin'}
                    }
                    const result = await usreCollection.updateOne(filter, updateDoc)
                    res.json(result)
                }
            }else{
                res.status(403).json({message: "you do not authorised"})
            }
           
            
        });

        // 

        app.post('/create-payment-intent', async(req, res)=>{
            const paymentInfo = req.body;
            const amount =paymentInfo.price *100;
            const paymentIntent= await stripe.paymentIntents.create({
                currency:'usd',
                amount:amount,
                payment_method_types:['card']
            });
            res.json({clientSecret: paymentIntent.client_secret} )
        })

        
    }finally{
        // await client.close()
    }
    
}


run().catch(console.dir)


app.get('/',(req, res)=>{
    res.send('hello doctor protall')
});

app.listen(port, ()=>{
    console.log('listening port' , port)
})

// naming conversion 

// app.get('/users')
// app.get('/users/:id')
// app.put('/users')
// app.put('/users/:id')
// app.delete('/users/:id')
// app.post('/users')