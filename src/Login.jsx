import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const GOOGLE_SHEETS_USERS_AUTH_URL = "https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec?v=pegar_usuario";

export default function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔹 Busca usuários da aba "Usuarios Renovação"
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const response = await fetch(GOOGLE_SHEETS_USERS_AUTH_URL);
        const data = await response.json();

        if (Array.isArray(data)) {
          localStorage.setItem("Usuarios Renovação", JSON.stringify(data));
        } else {
          console.warn("Formato inesperado ao buscar usuários:", data);
          localStorage.setItem("Usuarios Renovação", JSON.stringify([]));
        }
      } catch (error) {
        console.error("Erro ao buscar usuários da aba Usuarios Renovação:", error);
        localStorage.setItem("Usuarios Renovação", JSON.stringify([]));
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();

    const usuariosSalvos = JSON.parse(localStorage.getItem("Usuarios Renovação")) || [];

    const usuarioEncontrado = usuariosSalvos.find(
      (u) =>
        u.usuario === usuario &&
        u.senha === senha &&
        u.status === "Ativo" // ✅ Apenas usuários ativos
    );

    if (usuarioEncontrado) {
      localStorage.setItem("auth", "true");
      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioEncontrado)); // opcional
      navigate("/dashboard");
    } else {
      setErro("Usuário, senha ou status inválidos.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-600 text-lg">Carregando usuários...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        {erro && <p className="text-red-500 text-sm mb-4">{erro}</p>}
        <input
          type="text"
          placeholder="Usuário"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          className="w-full px-4 py-2 border rounded mb-4"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full px-4 py-2 border rounded mb-4"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
