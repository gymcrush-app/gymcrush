 INSERT INTO gyms (name, address, city, state, country, location)
      VALUES (
        'Test Gym Downtown',
        '123 Main Street',
        'San Francisco',
        'CA',
        'USA',
        ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)
      )
      RETURNING *;