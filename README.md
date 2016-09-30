SuddenFeedback
==============

![](http://suddendevelopment.com/assets/images/screenshot1.png)

Requirements
============
1. Node
2. MongoDB

Getting Started
===============
1) Set up a Twitter account

2) Generate an API key (or just use Anthong's creds: see below).

3) If you generated your own API key, then modify the Twitter config file
    (config/twitter.json) to include an entry for your account (SKIP, if you're
    using Anthong's creds):

    "<your twitter handle>":{
        "api_key": "<twitter api key>",
        "api_secret": "<twitter api secret>"
    }

4) Non-Vagrant users proceed to step 5. Vagrant users: you have to configure your
    Vagrant config file ("Vagrantfile") to contain an entry to forward ports 3000
        and 3001 from the host to the guest machine. To do this:

    4a) Shut down Vagrant: vagrant halt
    4b) Modify Vagrantfile to forward ports needed for the main app and socket
        communication:

        config.vm.network "forwarded_port", guest: 3000, host: 3000
        config.vm.network "forwarded_port", guest: 3001, host: 3001

    4c) Start Vagrant: vagrant up
    4d) SSH to the Vagrant box: vagrant ssh

5) Start mongo. Perhaps one of the following:

    5a) /usr/local/mongodb/bin/mongod
    5b) sudo /usr/bin/mongod

6) Start the app:
    cd <project directory>
    node app.js --seed --auth=anthony // If you want to seed the app and use the default auth credentials for single sign on
    node app.js --auth=gonzo // If you want to use a different set of auth credentials
    node app.js // No seeding. Uses the default auth credentials

7) Point to the app from a browser: http://localhost:3000/login

8) Use the "Enter" link on the login page ('/login') to do single sign on via your Twitter account.

Idea and task list in todo file.

General Concepts
================

Pages
================
- login: Self explanatory, login with passport if previously registered
- register: Register with passport
- home: Show existing reports, choose them for loading or publishing, create new ones
- billing: subscribe for services
- layout: live report page
- view: previous report viwer with point in time data and notes. For anyone authorized for viewing (public or specified)
- admin: for admins, to see usage statas and account management

1. Reports
================
- A report combines an overall concept, exploration or monitoring of a subject
- Filter the noise, constantly show what's most important and sort by importance
- High information density, everything has meaning, borders, position, color

2. Columns
================
- Columns are paths within the report scope, everything within the column is within that columns context
- Columns are intended to be compared between each other.
- Column context can differ based on word matching, or show diferent sides of other more complex analysis such as sentiment, complexity, or distance from a subject
- Columns always contain items as a the basic unit by default.
- The Hbar above the columns shows a distribution between the columns.
- Special columns can be aded and used for things such as Notes or presentations.
- Whatever Analysis that is chosen for a column as constantly summed in the column header.
- The distribution % is also shown in the column header, this matches the HBar above the columns.

3. Column Items
================
- If notes are added to items by a user the note will be added in the notes column.
- .Items are intended to be significant, If they are not significant enough to be displayed there is an issue in one of 3 areas: enough data, analysis for selecting items, report config.
- Item borders are updated to show which ones are new and which have been recently updated. Each column acts as a seperate bucket.
columns have a display limit and sort order, the server side decides which ones are worth sending to the UI based on that criteria.
- Items break down into sections in layout: Title, text, image, link, entities, priority. Title bars will only show if a title property exists. text will take a full width if image doesnt exist. link, entities and priority will always be the bottome row, left center and right justified. entities is intended for various icons describing attributes of the item.

4. Column Components
================
- Components can be added to a column and they stack from the bottom. Any space not used by components will be used for the items
- Components are more rigid, they can be things like maps, charts, dynamic lists, stats
- Components are a good place to display specific analysis, aggregate info from a column/context
