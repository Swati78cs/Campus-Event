import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

export default function AppLayout({ children }) {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">{children}</main>
      <Footer />
    </div>
  );
}
