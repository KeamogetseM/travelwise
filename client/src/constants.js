// The cost-prediction model was trained only on these routes/classes
// (Kaggle "Flight Price Prediction" dataset covers India's 6 metro cities),
// so anywhere origin/destination/class is chosen is constrained to what it
// can meaningfully predict, rather than left as free text.
export const CITIES = ["Bangalore", "Chennai", "Delhi", "Hyderabad", "Kolkata", "Mumbai"];
export const CLASSES = ["Economy", "Business"];
