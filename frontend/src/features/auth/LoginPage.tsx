import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { useLogin } from "./hooks";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    await login.mutateAsync(data);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8"
      >
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-600">DevSync AI</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@company.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />

          {login.error && (
            <p className="text-sm text-red-500 text-center">
              {(login.error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Login failed"}
            </p>
          )}

          <Button type="submit" loading={login.isPending} className="w-full">
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link to="/register" className="text-brand-600 font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
