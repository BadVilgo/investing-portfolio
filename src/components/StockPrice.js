import React, { useState, useEffect } from "react";

function StockPrice() {
  const [stockPrice, setStockPrice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStockPrice = async () => {
      try {
        const response = await fetch("http://localhost:5000/scrape");
        const data = await response.json();

        if (response.ok) {
          setStockPrice(data.price);
        } else {
          console.error("Error fetching stock price:", data.error);
        }
      } catch (error) {
        console.error("Error fetching stock price:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStockPrice();
  }, []);

  return (
    <div>
      <h1>NVIDIA Stock Price</h1>
      <p>{stockPrice}</p>
    </div>
  );
}

export default StockPrice;
