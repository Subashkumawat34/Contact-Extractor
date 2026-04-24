# Contact Extractor (MEAN Stack + OCR)

A full-stack, state-of-the-art contact extraction web application. Upload any image (screenshots, business cards, ledgers, dialer logs) and the application will extract verified, real telephone numbers via Optical Character Recognition (OCR) and securely pack them into an Excel-friendly CSV download.

Built beautifully with a glowing, ultra-premium neo-glassmorphic frontend and a defensively programmed Node.js backend to guarantee data purity.

## 🚀 How to Run the Project

This project uses a separated architecture. You will need two terminal windows running simultaneously.

### 1. Database Setup
Ensure that **MongoDB** is installed and running locally on your machine on port `27017`.

### 2. Start the Backend Server (Node.js)
Open your first terminal and navigate to the backend folder:
```bash
cd backend
npm install
npm start
```
The server will boot up and listen on `http://localhost:3000`.

### 3. Start the Frontend App (Angular 17)
Open your second terminal and navigate to the frontend folder:
```bash
cd frontend
npm install
npm start
```
Your browser should automatically open `http://localhost:4200` to display the application.

---

## 🧠 Comprehensive Architectural Flow

Here is a detailed, step-by-step breakdown of exactly how this application functions under the hood.

### Phase 1: The User Interface (Angular Frontend)
**1. Image Selection & Preview**
* The user interacts with the `<app-extractor>` component by either dragging and dropping an image onto the glowing dashed box or clicking to open the native file browser.
* Angular automatically reads the physical image purely locally into a browser cache (using the standard `FileReader` API) and instantaneously displays an interactive preview pane.

**2. Form Submission**
* When the user clicks **"Extract Contacts"**, Angular initializes a multi-part form payload (`FormData`) attaching the raw Image File directly onto this payload.
* Angular's `HttpClient` triggers a POST request, dispatching the payload across the network to our Express backend at `http://localhost:3000/api/upload`.

### Phase 2: The Server & OCR Pipeline (Node.js Backend)
**3. Handling the File Upload (`Multer`)**
* When the HTTP request hits Node.js, the intermediate middleware package `multer` intercepts it. 
* Instead of saving the image as a physical file on your server's hard drive (which is slow and clutters your computer), `multer.memoryStorage()` securely caches the image data directly in the server's RAM memory (as a Buffer block).

**4. Optical Character Recognition (`Tesseract.js`)**
* The Node.js application routes this memory Buffer directly into `tesseract.js`.
* Tesseract engines rapidly scan the pixels of the image and mathematically convert any letters, numbers, and symbols into standard machine text. This gigantic string of raw, messy unformatted text is returned.

### Phase 3: The Data Purification Pipeline
This is the core differentiator of the project: separating actual contact numbers from chaotic OCR noise (like battery percentages, connection status, time codes, or ID arrays).

**5. Isolating Visual Columns / Lists**
* *The Problem:* Tesseract natively squashes numbers from different table columns right next to each other, separated by only a few invisible spaces.
* *The Fix:* We chop the raw text down into isolated "chunks" by physically splitting the string wherever there is a comma, a newline, a tab, or `2+` consecutive spaces. This keeps columns and vertical dialer lists structurally distinct!

**6. Forgiving Regex Sweeper**
* We run a highly resilient Regular Expression (`/\+?(?:\d[a-zA-Z]{0,2}[\s\-().]*){2,25}\d/g`) specifically designed to bypass OCR letter hallucinations. It allows up to **2 random typo letters** between digits so that if Tesseract accidentally scanned `1800-111-61b1`, it won't abruptly cut the number in half at the letter `b`! 
* It subsequently scrubs out any alpha-characters (a-Z), stripping out the hallucinated characters entirely.

**7. Strict Contact Identification**
* Now we have pure sequences of digits, but we need to prove they are *actual contact numbers*. The system runs grueling conditional checkpoints against every piece of data. 
* It inherently rejects order IDs, times (e.g. `12:44`), or battery logs (e.g., `93%`). It only accepts the data if it perfectly matches:
  - **Indian Mobile**: 10 digits starting with 6, 7, 8, or 9.
  - **Indian Mobile + Code**: 12 digits starting with 91.
  - **International**: 10-15 digits starting with a `+`.
  - **Indian Landline**: 11 digits starting with 0.
  - **Toll-Free**: Starting with 1800 or 1860.

### Phase 4: Storage & JSON Response (MongoDB to Angular)
**8. Database Saving (`Mongoose`)**
* With the filtered array of telephone numbers finalized, Node.js constructs a new Mongoose Document (`Extraction` schema) logging the original filename, time of upload, and array data, permanently writing history into your local MongoDB.

**9. Responding to the Client**
* Node.js finalizes the network transaction by responding to Angular with a JSON payload containing `{ success: true, extractedNumbers: [...] }`.

### Phase 5: The UI Result & File Export (Angular)
**10. Displaying the Grid**
* Angular halts the spinning "Processing..." animation and uses an `*ngFor` loop to instantly stamp out custom-animated glassmorphic cards out into the front-end DOM for every single contact returned.

**11. Securing CSV Formatting**
* When the user hits **"Download CSV"**, Angular translates the strings strictly into Excel formulas (e.g. `="+919876543210"`). By forcing the string inside this `= " "` formula envelope, it completely stops Microsoft Excel from "helpfully" converting numbers into scientific notation (like `9.87E+11`) or permanently deleting crucial leading zeroes.
* Finally, Angular constructs a virtual text file Blob, points an invisible hyperlink to it, and programmatically clicks it to trigger your browser's download window natively.
