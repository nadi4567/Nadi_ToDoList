import dotenv from 'dotenv';
dotenv.config();
//dotenv.config() is a function that loads the variables from the .env file into process.env.
import express from "express";
const app  = express();

import mongoose from "mongoose";
import _ from "lodash";
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.set('view engine', 'ejs');
// let's connect to mongoDb server to store our data

const password = process.env.MONGODB_PASSWORD 
// process is a global object in Node.js that provides information and control over the current Node.js process 
mongoose.connect(`mongodb+srv://Nadi78:${password}@cluster0.jkndiqj.mongodb.net/mytodolistDB?retryWrites=true&w=majority`,{
    useNewUrlParser: true,
   
    useUnifiedTopology: true
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("Connected successfully");
});
// make a item schema
const itemSchema = new mongoose.Schema({
    name:String,
});
// create a model for itemSchema
const Item = mongoose.model("Item",itemSchema);
// let's create documents for our items data collections based on Item model
const item1 = new Item({
    name:'Welcome to your to_Do_List'
});
const item2 = new Item({
    name:'Hit the + button to add new items'
});
  const item3 = new Item({
    name : '<-- Hit this to delete item'
 });
const defaultItems = [item1,item2,item3]
// let's create another schema for custom list
const listSchema = new mongoose.Schema({
    name:String,
    items:[itemSchema]
})
const List = mongoose.model("List",listSchema);

// global varibles by post route in order to use from inside get method

let options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
let day = new Date().toLocaleDateString(undefined,options)
//routing home page
app.get("/", async (req, res) => {
    try {
      // Let's check our items
      const foundItems = await Item.find({});
      
      // Let's check if our database is empty or not
      if (foundItems.length === 0) {
        console.log(foundItems.length);
        // Let's insert our default items into the database if our database is empty
        await Item.insertMany(defaultItems);
        console.log("Inserted default items into the database");
        res.redirect("/");
      } else {
        res.render("index.ejs", {
          listTitle: day,
          newListItems: foundItems
        });
        console.log(`Existing Items are ${foundItems}`);
      }
    } catch (err) {
      console.log(err.message);
    }
  });
  
// create dynamic route when user want to create list
app.get("/:customListName",(req,res)=>{
     const customListName = _.capitalize(req.params.customListName);
     List.findOne({name:customListName}).then((foundLists)=>{
        // if lists doesn't already exit
        if(foundLists){
            console.log("exit");
            // otherwise, we'll render our index.ejs
            res.render("index.ejs",{
                listTitle:foundLists.name,// TitleName is user's typed
                newListItems : foundLists.items // items are array from listschema
            });
        }else{
           console.log("doesn't exit");
           const list = new List({ // we'll create our list 
            name:customListName,
            items : defaultItems
           }) ;
           list.save();// And save into our database
           res.redirect(`/${customListName}`);// let's redirect to route user typed
        }
     }).catch(err=>{
        console.error(err.message)
     })
})



//posting data to home page
app.post("/",(req,res)=>{
    let itemName = req.body.newItem;
    // user's List'name
    let listName = req.body.list;// taking from our button value when the user click button 
    //let's create newItem based on Item model
    const newItem = new Item({
        name : itemName
    });
    console.log("User's title is",listName)
    if(listName === day){// if user's list is today
        newItem.save();// let's save our newItem into database
        res.redirect("/") // And redirect out home route
    }else{ 
        List.findOne({name:listName}).then((foundLists)=>{
            // otherwise,we check lists with user's listname
             
           
            foundLists.items.push(newItem);//And,we push into lists.item[] array
            foundLists.save();// And, we save into our database
            res.redirect(`/${listName}`);// redirect to our user's list route
            console.log(foundLists)
        }).catch(err=>{
            console.error(err.message)
        })
    }
   
    
});
// well let's delete the items
app.post("/delete",(req,res)=>{
    const checkItemId = req.body.checkbox;
    const listName = req.body.listName;
    if(listName === day){
        Item.findByIdAndRemove(checkItemId).then(()=>{
            console.log("successfully deleted");
            res.redirect("/")
        }).catch(err=>{
            console.error(err)
        });
       
    }else{
        List.findOneAndUpdate({name:listName},{$pull:{items:{_id:checkItemId}}},{  returnOriginal: false
        })
        .then((foundList)=>{
            if(foundList){
                res.redirect(`/${listName}`);
                console.log(`Update documents after deleted ${foundList}`)
            }
           
        }).catch(err=>{
           console.error(err.message)
        })
    }
    
})

const port = process.env.PORT || 3000;
// listening on port 3000
app.listen(port,()=>{
    console.log(`server running on ${port}`)
})