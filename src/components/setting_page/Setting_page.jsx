import { useState, useEffect } from "react";
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

function Setting_page() {
  const [activeTab, setActiveTab] = useState("notifications");

  // Notification toggles
  const [notifications, setNotifications] = useState(null);

  // Menu settings toggles
  const [menuSettings, setMenuSettings] = useState(null);

  // Delivery settings
  const [deliverySettings, setDeliverySettings] = useState({
    minOrder: "10.00",
    deliveryFee: "4.99",
    deliveryRadius: "5",
    avgPrepTime: "25",
    avgDeliveryTime: "30",
  });

  // // Security settings
  // const [securitySettings, setSecuritySettings] = useState({
  //   currentPassword: "",
  //   newPassword: "",
  //   confirmPassword: "",
  //   twoFactor: false,
  // });

  const tabs = [
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "delivery", label: "Delivery", icon: Package },
    { id: "menu", label: "Menu Settings", icon: Utensils },
    { id: "payment", label: "Payment", icon: CreditCard },
    // { id: "security", label: "Security", icon: Lock },
  ];

  const handleNotificationToggle = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMenuToggle = (key) => {
    setMenuSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTaxRateChange = (value) => {
    setMenuSettings((prev) => ({ ...prev, taxRate: value }));
  };

  const handleDeliveryChange = (key, value) => {
    setDeliverySettings((prev) => ({ ...prev, [key]: value }));
  };

  // const handleSecurityChange = (key, value) => {
  //   setSecuritySettings((prev) => ({ ...prev, [key]: value }));
  // };

  // const handleSecurityToggle = () => {
  //   setSecuritySettings((prev) => ({ ...prev, twoFactor: !prev.twoFactor }));
  // };

  // Load notification settings from Firebase
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "Delivery Settings", "Notification"));

        if (snap.exists()) {
          const data = snap.data();
          console.log("Loaded notification data:", data);

          setNotifications({
            newOrders: data["New Orders"] ?? true,
            orderStatus: data["Order Status"] ?? true,
            lowStock: data["Low Stock"] ?? true,
            driverUpdates: data["Driver Update"] ?? true,
            weeklyReports: data["Weekly Reports"] ?? true,
          });
        } else {
          console.log("No notification document found");
          setNotifications({
            newOrders: true,
            orderStatus: true,
            lowStock: true,
            driverUpdates: true,
            weeklyReports: true,
          });
        }
      } catch (error) {
        console.error("Error loading notification settings:", error);
        setNotifications({
          newOrders: true,
          orderStatus: true,
          lowStock: true,
          driverUpdates: true,
          weeklyReports: true,
        });
      }
    };

    loadNotificationSettings();
  }, []);

  // Load delivery settings from Firebase
  useEffect(() => {
    const loadDeliverySettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "Delivery Settings", "settings"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDeliverySettings({
            minOrder: data["Minimum Order Amount"]?.toString() || "10.00",
            deliveryFee: data["Delivery Fee"]?.toString() || "4.99",
            deliveryRadius: data["Delivery Radius (miles)"]?.toString() || "5",
            avgPrepTime:
              data["Average Preparation Time (minutes)"]?.toString() || "25",
            avgDeliveryTime:
              data["Average Delivery Time (minutes)"]?.toString() || "30",
          });
        }
      } catch (error) {
        console.error("Error loading delivery settings:", error);
      }
    };

    loadDeliverySettings();
  }, []);

  // Load menu settings from Firebase
  useEffect(() => {
    const loadMenuSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "Delivery Settings", "Menu Setting"));

        if (snap.exists()) {
          const data = snap.data();
          console.log("Loaded menu data:", data);

          setMenuSettings({
            autoDisable: data["Auto Disable"] ?? true,
            displayPrepTime: data["Prep Time"] ?? true,
            showRatings: data["Ratings"] ?? true,
            taxRate: data["Tax Rate"]?.toString() || "8.5",
          });
        } else {
          console.log("No menu document found");
          setMenuSettings({
            autoDisable: true,
            displayPrepTime: true,
            showRatings: true,
            taxRate: "8.5",
          });
        }
      } catch (error) {
        console.error("Error loading menu settings:", error);
        setMenuSettings({
          autoDisable: true,
          displayPrepTime: true,
          showRatings: true,
          taxRate: "8.5",
        });
      }
    };

    loadMenuSettings();
  }, []);

  const saveDeliverySettings = async () => {
    try {
      await setDoc(doc(db, "Delivery Settings", "settings"), {
        "Minimum Order Amount": parseFloat(deliverySettings.minOrder) || 0,
        "Delivery Fee": parseFloat(deliverySettings.deliveryFee) || 0,
        "Delivery Radius (miles)":
          parseFloat(deliverySettings.deliveryRadius) || 0,
        "Average Preparation Time (minutes)":
          parseFloat(deliverySettings.avgPrepTime) || 0,
        "Average Delivery Time (minutes)":
          parseFloat(deliverySettings.avgDeliveryTime) || 0,
      });
      toast.success("Delivery settings saved successfully!");
    } catch (error) {
      console.error("Error saving delivery settings:", error);
      toast.error("Failed to save delivery settings. Please try again.");
    }
  };

  const saveNotificationSettings = async () => {
    console.log("Saving notifications:", notifications);
    try {
      await setDoc(
        doc(db, "Delivery Settings", "Notification"),
        {
          "New Orders": notifications.newOrders,
          "Order Status": notifications.orderStatus,
          "Low Stock": notifications.lowStock,
          "Driver Update": notifications.driverUpdates,
          "Weekly Reports": notifications.weeklyReports,
        },
        { merge: true }
      );
      console.log("Save successful!");
      toast.success("Notification settings saved successfully!");
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast.error("Failed to save notification settings");
    }
  };

  const saveMenuSettings = async () => {
    console.log("Saving menu settings:", menuSettings);
    try {
      await setDoc(
        doc(db, "Delivery Settings", "Menu Setting"),
        {
          "Auto Disable": menuSettings.autoDisable,
          "Prep Time": menuSettings.displayPrepTime,
          Ratings: menuSettings.showRatings,
          "Tax Rate": parseFloat(menuSettings.taxRate) || 0,
        },
        { merge: true }
      );
      console.log("Menu save successful!");
      toast.success("Menu settings saved successfully!");
    } catch (error) {
      console.error("Error saving menu settings:", error);
      toast.error("Failed to save menu settings");
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
                              handleDeliveryChange("minOrder", e.target.value)
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
                                e.target.value
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
                              e.target.value
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
                            handleDeliveryChange("avgPrepTime", e.target.value)
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
                              e.target.value
                            )
                          }
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Platform Fee
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
                                e.target.value
                              )
                            }
                            className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                      
                    </div>

                    <button
                      onClick={saveDeliverySettings}
                      className="mt-8 flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition">
                      <Check size={18} />
                      Save Changes
                    </button>
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

                {/* Security Tab */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Setting_page;
