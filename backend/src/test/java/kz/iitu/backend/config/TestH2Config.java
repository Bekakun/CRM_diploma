package kz.iitu.backend.config;

import org.hibernate.boot.model.TypeContributions;
import org.hibernate.boot.model.TypeContributor;
import org.hibernate.dialect.Dialect;
import org.hibernate.engine.jdbc.spi.JdbcServices;
import org.hibernate.service.ServiceRegistry;
import org.hibernate.type.SqlTypes;
import org.hibernate.type.descriptor.jdbc.VarcharJdbcType;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/**
 * Replaces PostgreSQL NAMED_ENUM jdbc type with VARCHAR for H2 compatibility in tests.
 */
@TestConfiguration
public class TestH2Config {

    @Bean
    public TypeContributor namedEnumToVarcharContributor() {
        return new TypeContributor() {
            @Override
            public void contribute(TypeContributions typeContributions, ServiceRegistry serviceRegistry) {
                Dialect dialect = serviceRegistry.requireService(JdbcServices.class).getDialect();
                if (dialect instanceof org.hibernate.dialect.H2Dialect) {
                    typeContributions.contributeJdbcType(new VarcharJdbcType() {
                        @Override
                        public int getJdbcTypeCode() {
                            return SqlTypes.NAMED_ENUM;
                        }
                    });
                }
            }
        };
    }
}
