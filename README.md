# Jobscura

- ‘Obscura,’ famously used in camera obscura meaning ‘dark chamber,’ refers to an early device that projected hidden images with light.
- Jobscura is a Chrome extension that enhances LinkedIn job postings by showing additional insights such as job views, applications, and expiration dates. It helps users track and analyze job postings more effectively while browsing LinkedIn.

## Example Image
<img width="720" height="371" alt="image" src="https://github.com/user-attachments/assets/d5e837c0-caed-47da-b9e6-7dbd804d09a6" />

## Features

- Displays real-time views and application counts for LinkedIn jobs.
- Shows job expiration information in a clear, easy-to-read format.
- Implements a **CounterAPI** integration to track analytics on jobs viewed with the extension.
- Uses injected scripts to intercept network requests and URL changes while keeping Chrome API calls and DOM manipulation safe in a content script.

## Installation

1. Download it on the chrome store :) [Link](https://chromewebstore.google.com/detail/hjdcfkenbmeglkiagaopohnficimablo?utm_source=item-share-cb)

OR

1. Clone this repository:

   ```bash
   git clone https://github.com/bnquon/linkedin-job-counter.git

3. Open Chrome and go to `chrome://extensions`.
4. Enable **Developer mode** in the top-right corner.
5. Click **Load unpacked** and select the repository folder.
