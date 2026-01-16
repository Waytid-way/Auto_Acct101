#!/bin/bash
set -e

mongosh --host localhost:27017 <<EOF
try {
  rs.status();
  console.log('Replica set already initialized');
} catch {
  console.log('Initializing replica set...');
  rs.initiate({
    _id: "rs0",
    members: [
      { _id: 0, host: "localhost:27017" }
    ]
  });
}
EOF
