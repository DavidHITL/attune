
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="font-semibold text-xl hover:opacity-80 transition-opacity">
          Attune
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="toggle-animation"
              >
                Logout
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="toggle-animation">Login</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
