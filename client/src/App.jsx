import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Rentals from './pages/Rentals.jsx';
import RentalDetail from './pages/RentalDetail.jsx';
import Book from './pages/Book.jsx';
import Packages from './pages/Packages.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import BookingConfirmed from './pages/BookingConfirmed.jsx';
import BuildMyEvent from './pages/BuildMyEvent.jsx';
import RequestQuote from './pages/RequestQuote.jsx';
import Landing from './pages/Landing.jsx';
import Gallery from './pages/Gallery.jsx';
import Blog from './pages/Blog.jsx';
import BlogPost from './pages/BlogPost.jsx';
import ServiceAreas from './pages/ServiceAreas.jsx';
import ServiceAreaDetail from './pages/ServiceAreaDetail.jsx';
import Calculators from './pages/Calculators.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import DjPortal from './pages/DjPortal.jsx';
import QuoteView from './pages/QuoteView.jsx';
import Admin from './pages/admin/Admin.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/rentals" element={<Rentals />} />
        <Route path="/rentals/:id" element={<RentalDetail />} />
        <Route path="/book" element={<Book />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/booking-confirmed/:id" element={<BookingConfirmed />} />
        <Route path="/build-my-event" element={<BuildMyEvent />} />
        <Route path="/request-quote" element={<RequestQuote />} />
        <Route path="/dj-rental" element={<Landing page="dj-rental" />} />
        <Route path="/corporate-av" element={<Landing page="corporate-av" />} />
        <Route path="/event-production" element={<Landing page="event-production" />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/service-areas" element={<ServiceAreas />} />
        <Route path="/service-areas/:slug" element={<ServiceAreaDetail />} />
        <Route path="/calculators" element={<Calculators />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/dj-portal" element={<DjPortal />} />
        <Route path="/quote/:id" element={<QuoteView />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
