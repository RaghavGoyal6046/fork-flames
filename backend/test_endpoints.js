async function test() {
    try {
        // 1. Register
        const regRes = await fetch('http://127.0.0.1:5001/api/auth/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                name: 'Test User', email: `test${Date.now()}@test.com`, password: 'password123', role: 'customer'
            })
        });
        const regData = await regRes.json();
        console.log('Register:', regData);
        if(!regData.token) return;
        const token = regData.token;

        // 2. Booking
        const bookRes = await fetch('http://127.0.0.1:5001/api/bookings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({ date: '2026-12-12', time: '19:00', guests: 2, specialRequests: '' })
        });
        console.log('Booking:', await bookRes.json());

        // 3. Order
        const orderRes = await fetch('http://127.0.0.1:5001/api/orders', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({
                orderType: 'delivery',
                tableName: null,
                items: [{
                    menuItem: '6639b981f9b3191c9c811111',
                    name: 'Pizza',
                    quantity: 1,
                    price: 15
                }],
                subtotal: 15,
                tax: 1.5,
                deliveryFee: 4.99,
                totalAmount: 21.49
            })
        });
        console.log('Order:', await orderRes.json());

    } catch(e) {
        console.error(e);
    }
}
test();
