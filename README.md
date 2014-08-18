SuddenFeedback
==============

Requirements
============
1. Node
2. MongoDB

Getting Started
===============
1. start mongo /usr/local/mongodb/bin/mongod
2. insert record from default_report.json into suddenfeedback.reports
3. start app ./node app.js
4. point to the app from a browser http://localhost:3000
5. login to twitter from the app

Idea and task list in todo file.

General Concepts
================
1. A report combines an overall concept, exploration or monitoring of a subject
2. Columns are paths within the report scope, everything within the column is within that columns context
3. Columns are intended to be compared between each other.
4. Column context can differ based on word matching, or show diferent sides of other more complex analysis such as sentiment, complexity, or distance from a subject
5. Columns always contain items as a the basic unit by default.
5. Whatever Analysis that is chosen for a column as constantly summed in the column header.
5. The distribution % is also shown in the column header, this matches the HBar above the columns.
6. Components can be added to a column and they stack from the bottom. Any space not used by components will be used for the items
7. Components are more rigid, they can be things like maps, charts, dynamic lists, stats
8. Components are a good place to display specific analysis, aggregate info from a column/context
9. Items, and columns can be dynamically sprted on updating scores.
10. The Hbar above the columns shows a distribution between the columns.
11. Special columns can be aded and used for things such as Notes or presentations.
12. If notes are added to items by a user the note will be added in the notes column.
13 .Items are intended to be significant, If they are not significant enough to be displayed there is an issue in one of 3 areas: enough data, analysis for selecting items, report config.
14. Item borders are updated to show which ones are new and which have been recently updated. Each column acts as a seperate bucket.
columns have a display limit and sort order, the server side decides which ones are worth sending to the UI based on that criteria.

