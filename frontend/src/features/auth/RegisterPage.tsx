import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { useRegister } from "./hooks";

const schema = z.object({
  email: z.string().email("Invalid email"),
  username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/, "Letters, numbers, _ and - only"),
  full_name: z.string().min(1, "Name required"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "One uppercase letter required")
    .regex(/[0-9]/, "One number required"),
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const register_ = useRegister();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    await register_.mutateAsync(data);
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
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full Name" placeholder="Jane Smith" error={errors.full_name?.message} {...register("full_name")} />
          <Input label="Username" placeholder="janesmith" error={errors.username?.message} {...register("username")} />
          <Input label="Email" type="email" placeholder="jane@company.com" error={errors.email?.message} {...register("email")} />
          <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register("password")} />

          {register_.error && (
            <p className="text-sm text-red-500 text-center">
              {(register_.error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Registration failed"}
            </p>
          )}

          <Button type="submit" loading={register_.isPending} className="w-full">
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
