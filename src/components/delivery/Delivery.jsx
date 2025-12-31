import {
  Mail,
  Phone,
  MapPin,
  Star,
  MapPinned,
  Zap,
  Award,
  CreditCard,
} from "lucide-react";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase";

const Delivery = () => {
  const [drivers, setDrivers] = useState([]);
  const [preparingOrders, setPreparingOrders] = useState(0);

  // Fetch drivers from Firestore
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "drivers"));
        const driversList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDrivers(driversList);
      } catch (error) {
        console.error("Error fetching drivers:", error);
      }
    };
    fetchDrivers();
  }, []);

  // Fetch orders and count preparing status
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "orders"));
        const preparingCount = querySnapshot.docs.filter(
          (doc) => doc.data().order_status === "preparing"
        ).length;
        setPreparingOrders(preparingCount);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };
    fetchOrders();
  }, []);

  // Calculate stats
  const activeDrivers =
    drivers && drivers.length > 0 ? drivers.filter((d) => d.status).length : 0;

  const totalDeliveries =
    drivers && drivers.length > 0
      ? drivers.reduce((sum, d) => sum + (d.no_of_delivery || 0), 0)
      : 0;

  // Calculate average rating from database
  const avgRating =
    drivers && drivers.length > 0
      ? (
          drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length
        ).toFixed(1)
      : "0.0";

  // Active orders count comes from preparing orders in orders collection
  const activeOrders = preparingOrders;

  return (
    <div className="min-h-full bg-slate-50 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Delivery Drivers
        </h1>
        <p className="text-slate-600">
          Manage your delivery team and track performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Active Drivers</p>
              <p className="text-3xl font-bold text-slate-800">
                {activeDrivers}
              </p>
              <p className="text-xs text-green-600 mt-1">Online now</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <MapPinned className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Deliveries</p>
              <p className="text-3xl font-bold text-slate-800">
                {totalDeliveries}
              </p>
              <p className="text-xs text-slate-600 mt-1">All time</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Zap className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Average Rating</p>
              <p className="text-3xl font-bold text-slate-800">{avgRating}</p>
              <p className="text-xs text-slate-600 mt-1">Out of 5.0</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Award className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Active Orders</p>
              <p className="text-3xl font-bold text-slate-800">
                {activeOrders}
              </p>
              <p className="text-xs text-orange-600 mt-1">In delivery</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <MapPin className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Driver Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {!drivers || drivers.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-6 shadow-sm border border-slate-200 text-center text-slate-600">
            No Drivers found matching your search.
          </div>
        ) : (
          drivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              {/* Driver Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`${
                      driver.color || "bg-purple-500"
                    } w-14 h-14 rounded-full flex items-center justify-center text-black text-lg font-bold shadow-md`}>
                    {driver.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {driver.name}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {driver.vehicle_type}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 ${
                    driver.status
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-red-600"
                  } text-xs font-medium rounded-full`}>
                  {driver.status ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Rating Section */}
              {driver.rating && (
                <div className="flex items-center gap-1 mb-4">
                  <Star className="text-yellow-500 fill-yellow-500" size={16} />
                  <span className="font-semibold text-slate-800">
                    {driver.rating.toFixed(1)}
                  </span>
                  {/* <span className="text-sm text-slate-600">
                    ({driver.reviews || 0} reviews)
                  </span> */}
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail size={14} />
                  <span>{driver.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CreditCard size={14} />
                  <span>{driver.license_plate}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone size={14} />
                  <span>{driver.ph_no}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={14} />
                  <span>{driver.address}</span>
                </div>
              </div>

              {/* Current Orders Alert */}
              {driver.currentOrders > 0 && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-700 font-medium">
                    Currently delivering {driver.currentOrders}{" "}
                    {driver.currentOrders === 1 ? "order" : "orders"}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Delivery;
