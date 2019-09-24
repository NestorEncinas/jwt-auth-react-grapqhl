import React from "react";
import { useUsersQuery } from "../generated/graphql";

const Home: React.FC = () => {
  const { data, loading } = useUsersQuery({ fetchPolicy: "network-only" });

  if (!data || loading) {
    return <div> Loading...</div>;
  }
  return (
    <div>
      <div>
        Users:
        <ul>
          {data.users.map(u => {
            return <li key={u.id}>{u.email}</li>;
          })}
        </ul>
      </div>
      Home page
    </div>
  );
};

export default Home;
