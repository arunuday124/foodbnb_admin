import { useState, useEffect, useRef } from "react";
import {
  Globe,
  Bell,
  Package,
  Utensils,
  CreditCard,
  Check,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { db } from "../../Firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Module-level cache to survive navigation
let cachedSettings = {
  notifications: null,
  menu: null,
  delivery: null,
};

function Setting_page() {
  const [activeTab, setActiveTab] = useState("notifications");
  const [notifications, setNotifications] = useState(
    cachedSettings.notifications,
  );
  const [menuSettings, setMenuSettings] = useState(cachedSettings.menu);
  const [deliverySettings, setDeliverySettings] = useState(
    cachedSettings.delivery,
  );
  const isMountedRef = useRef(true);

  const tabs = [
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "delivery", label: "Delivery", icon: Package },
    { id: "menu", label: "Menu Settings", icon: Utensils },
    { id: "payment", label: "Payment", icon: CreditCard },
  ];

  // Load all settings once on component mount
  useEffect(() => {
    isMountedRef.current = true;

    const loadAllSettings = async () => {
      try {
        // Load notifications only if not cached
        if (!cachedSettings.notifications) {
          const notifSnap = await getDoc(
            doc(db, "deliverySetting", "notification"),
          );
          if (!isMountedRef.current) return;

          if (notifSnap.exists()) {
            const data = notifSnap.data();
            const notifData = {
              newOrders: data.newOrder ?? true,
              orderStatus: data.orderStatus ?? false,
              lowStock: data.lowStock ?? true,
              driverUpdates: data.driverUpdate ?? false,
              weeklyReports: data.weeklyReport ?? false,
            };
            setNotifications(notifData);
            cachedSettings.notifications = notifData;
          } else {
            const defaultNotif = {
              newOrders: true,
              orderStatus: false,
              lowStock: true,
              driverUpdates: false,
              weeklyReports: false,
            };
            setNotifications(defaultNotif);
            cachedSettings.notifications = defaultNotif;
          }
        } else {
          setNotifications(cachedSettings.notifications);
        }

        // Load menu settings only if not cached
        if (!cachedSettings.menu) {
          const menuSnap = await getDoc(
            doc(db, "deliverySetting", "menuSettting"),
          );
          if (!isMountedRef.current) return;

          if (menuSnap.exists()) {
            const data = menuSnap.data();
            const menuData = {
              autoDisable: data.autoDisable ?? false,
              displayPrepTime: data.prepTime ?? true,
              showRatings: data.ratingMenu ?? true,
              taxRate: data.taxRate?.toString() || "5",
            };
            setMenuSettings(menuData);
            cachedSettings.menu = menuData;
          } else {
            const defaultMenu = {
              autoDisable: false,
              displayPrepTime: true,
              showRatings: true,
              taxRate: "5",
            };
            setMenuSettings(defaultMenu);
            cachedSettings.menu = defaultMenu;
          }
        } else {
          setMenuSettings(cachedSettings.menu);
        }

        // Load delivery settings only if not cached
        if (!cachedSettings.delivery) {
          const deliverySnap = await getDoc(
            doc(db, "deliverySetting", "settings"),
          );
          if (!isMountedRef.current) return;

          if (deliverySnap.exists()) {
            const data = deliverySnap.data();
            const deliveryData = {
              minOrder: data.minimumOrderAmount?.toString() || "50",
              deliveryFee: data.deliveryFee?.toString() || "8",
              deliveryRadius:
                data["deliveryRadius (miles)"]?.toString() || "10",
              avgPrepTime: data.averagePreparationTime?.toString() || "20",
              avgDeliveryTime: data.averageDeliveryTime?.toString() || "20",
            };
            setDeliverySettings(deliveryData);
            cachedSettings.delivery = deliveryData;
          } else {
            const defaultDelivery = {
              minOrder: "50",
              deliveryFee: "8",
              deliveryRadius: "10",
              avgPrepTime: "20",
              avgDeliveryTime: "20",
            };
            setDeliverySettings(defaultDelivery);
            cachedSettings.delivery = defaultDelivery;
          }
        } else {
          setDeliverySettings(cachedSettings.delivery);
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error("Error loading settings:", error);
          toast.error("Failed to load settings");
        }
      }
    };

    loadAllSettings();

    return () => {
      isMountedRef.current = false;
    };
  }, []); // Only run once on mount

  const handleNotificationToggle = (key) => {
    const updatedNotifications = {
      ...notifications,
      [key]: !notifications[key],
    };
    setNotifications(updatedNotifications);
    cachedSettings.notifications = updatedNotifications; // Update cache
  };

  const handleMenuToggle = (key) => {
    const updatedMenu = { ...menuSettings, [key]: !menuSettings[key] };
    setMenuSettings(updatedMenu);
    cachedSettings.menu = updatedMenu; // Update cache
  };

  const handleTaxRateChange = (value) => {
    const updatedMenu = { ...menuSettings, taxRate: value };
    setMenuSettings(updatedMenu);
    cachedSettings.menu = updatedMenu; // Update cache
  };

  const handleDeliveryChange = (key, value) => {
    const updatedDelivery = { ...deliverySettings, [key]: value };
    setDeliverySettings(updatedDelivery);
    cachedSettings.delivery = updatedDelivery; // Update cache
  };

  const saveNotificationSettings = async () => {
    try {
      await setDoc(
        doc(db, "deliverySetting", "notification"),
        {
          newOrder: notifications.newOrders,
          orderStatus: notifications.orderStatus,
          lowStock: notifications.lowStock,
          driverUpdate: notifications.driverUpdates,
          weeklyReport: notifications.weeklyReports,
        },
        { merge: true },
      );
      toast.success("Notification settings saved successfully!");
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast.error("Failed to save notification settings");
    }
  };

  const saveMenuSettings = async () => {
    try {
      await setDoc(
        doc(db, "deliverySetting", "menuSettting"),
        {
          autoDisable: menuSettings.autoDisable,
          prepTime: menuSettings.displayPrepTime,
          ratingMenu: menuSettings.showRatings,
          taxRate: parseFloat(menuSettings.taxRate) || 0,
        },
        { merge: true },
      );
      toast.success("Menu settings saved successfully!");
    } catch (error) {
      console.error("Error saving menu settings:", error);
      toast.error("Failed to save menu settings");
    }
  };

  const saveDeliverySettings = async () => {
    try {
      await setDoc(
        doc(db, "deliverySetting", "settings"),
        {
          minimumOrderAmount: parseFloat(deliverySettings.minOrder) || 0,
          deliveryFee: parseFloat(deliverySettings.deliveryFee) || 0,
          "deliveryRadius (miles)":
            parseFloat(deliverySettings.deliveryRadius) || 0,
          averagePreparationTime: parseFloat(deliverySettings.avgPrepTime) || 0,
          averageDeliveryTime:
            parseFloat(deliverySettings.avgDeliveryTime) || 0,
        },
        { merge: true },
      );
      toast.success("Delivery settings saved successfully!");
    } catch (error) {
      console.error("Error saving delivery settings:", error);
      toast.error("Failed to save delivery settings. Please try again.");
    }
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ top: "80px" }}
      />
      <div className="min-h-full bg-gray-50 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Settings
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your application settings and preferences
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="w-full lg:w-64 shrink-0">
              <div className="bg-white rounded-lg border border-gray-200 p-2 space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                        activeTab === tab.id
                          ? "bg-orange-500 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}>
                      <Icon size={18} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
                {/* Notifications Tab */}
                {activeTab === "notifications" && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      Notification Settings
                    </h2>

                    {notifications === null ? (
                      <p className="text-gray-500">
                        Loading notification settings...
                      </p>
                    ) : (
                      <>
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                New Orders
                              </p>
                              <p className="text-sm text-gray-600">
                                Get notified when new orders arrive
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                handleNotificationToggle("newOrders")
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                notifications.newOrders
                                  ? "bg-orange-500"
                                  : "bg-gray-300"
                              }`}>
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                  notifications.newOrders
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                Order Status Updates
                              </p>
                              <p className="text-sm text-gray-600">
                                Updates about order status changes
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                handleNotificationToggle("orderStatus")
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                notifications.orderStatus
                                  ? "bg-orange-500"
                                  : "bg-gray-300"
                              }`}>
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                  notifications.orderStatus
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                Low Stock Alerts
                              </p>
                              <p className="text-sm text-gray-600">
                                Alert when menu items are running low
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                handleNotificationToggle("lowStock")
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                notifications.lowStock
                                  ? "bg-orange-500"
                                  : "bg-gray-300"
                              }`}>
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                  notifications.lowStock
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                Driver Updates
                              </p>
                              <p className="text-sm text-gray-600">
                                Notifications about driver availability
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                handleNotificationToggle("driverUpdates")
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                notifications.driverUpdates
                                  ? "bg-orange-500"
                                  : "bg-gray-300"
                              }`}>
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                  notifications.driverUpdates
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                Weekly Reports
                              </p>
                              <p className="text-sm text-gray-600">
                                Receive weekly business analytics reports
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                handleNotificationToggle("weeklyReports")
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                notifications.weeklyReports
                                  ? "bg-orange-500"
                                  : "bg-gray-300"
                              }`}>
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                  notifications.weeklyReports
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={saveNotificationSettings}
                          className="mt-8 flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition">
                          <Check size={18} />
                          Save Changes
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Delivery Tab */}
                {activeTab === "delivery" && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      Delivery Settings
                    </h2>

                    {deliverySettings === null ? (
                      <p className="text-gray-500">
                        Loading delivery settings...
                      </p>
                    ) : (
                      <>
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              Minimum Order Amount
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                ₹
                              </span>
                              <input
                                type="text"
                                value={deliverySettings.minOrder}
                                onChange={(e) =>
                                  handleDeliveryChange(
                                    "minOrder",
                                    e.target.value,
                                  )
                                }
                                className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              Delivery Fee
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                ₹
                              </span>
                              <input
                                type="text"
                                value={deliverySettings.deliveryFee}
                                onChange={(e) =>
                                  handleDeliveryChange(
                                    "deliveryFee",
                                    e.target.value,
                                  )
                                }
                                className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              Delivery Radius (miles)
                            </label>
                            <input
                              type="text"
                              value={deliverySettings.deliveryRadius}
                              onChange={(e) =>
                                handleDeliveryChange(
                                  "deliveryRadius",
                                  e.target.value,
                                )
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              Average Preparation Time (minutes)
                            </label>
                            <input
                              type="text"
                              value={deliverySettings.avgPrepTime}
                              onChange={(e) =>
                                handleDeliveryChange(
                                  "avgPrepTime",
                                  e.target.value,
                                )
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              Average Delivery Time (minutes)
                            </label>
                            <input
                              type="text"
                              value={deliverySettings.avgDeliveryTime}
                              onChange={(e) =>
                                handleDeliveryChange(
                                  "avgDeliveryTime",
                                  e.target.value,
                                )
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>

                        <button
                          onClick={saveDeliverySettings}
                          className="mt-8 flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition">
                          <Check size={18} />
                          Save Changes
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Menu Settings Tab */}
                {activeTab === "menu" && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      Menu Settings
                    </h2>

                    {menuSettings === null ? (
                      <p className="text-gray-500">Loading menu settings...</p>
                    ) : (
                      <>
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                Auto-disable Out of Stock Items
                              </p>
                              <p className="text-sm text-gray-600">
                                Automatically mark items as unavailable when
                                stock runs out
                              </p>
                            </div>
                            <button
                              onClick={() => handleMenuToggle("autoDisable")}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                menuSettings.autoDisable
                                  ? "bg-orange-500"
                                  : "bg-gray-300"
                              }`}>
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                  menuSettings.autoDisable
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                Show Ratings on Menu
                              </p>
                              <p className="text-sm text-gray-600">
                                Display customer ratings for each dish
                              </p>
                            </div>
                            <button
                              onClick={() => handleMenuToggle("showRatings")}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                menuSettings.showRatings
                                  ? "bg-orange-500"
                                  : "bg-gray-300"
                              }`}>
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                  menuSettings.showRatings
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                Display Prep Time
                              </p>
                              <p className="text-sm text-gray-600">
                                Show estimated preparation time for items
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                handleMenuToggle("displayPrepTime")
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                menuSettings.displayPrepTime
                                  ? "bg-orange-500"
                                  : "bg-gray-300"
                              }`}>
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                  menuSettings.displayPrepTime
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              Tax Rate (%)
                            </label>
                            <input
                              type="text"
                              value={menuSettings.taxRate}
                              onChange={(e) =>
                                handleTaxRateChange(e.target.value)
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>

                        <button
                          onClick={saveMenuSettings}
                          className="mt-8 flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition">
                          <Check size={18} />
                          Save Changes
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Payment Tab */}
                {activeTab === "payment" && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      Payment Settings
                    </h2>
                    <p className="text-gray-600">
                      Payment configuration coming soon...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Setting_page;
